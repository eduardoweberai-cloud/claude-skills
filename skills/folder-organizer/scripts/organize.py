#!/usr/bin/env python3
"""
folder-organizer toolkit — deterministic helpers for organizing a directory.

Subcommands:
  scan   <path> [--json out.json]   Inventory a folder: existing category dirs,
                                     loose files at root and inside categories,
                                     and duplicate/version candidates.
  apply  <path> --plan plan.json     Execute a move plan (list of {src,dest}).
                                     Never overwrites, never deletes. Writes an
                                     undo file so every run is reversible.
  undo   <undo-file>                 Reverse the moves recorded in an undo file.

Design notes for the calling agent:
  - This script ONLY scans and moves. It does NOT decide classifications.
    The agent reads the scan output, proposes a plan, gets user approval,
    then feeds the approved plan to `apply`.
  - Windows-safe: forces UTF-8 I/O so accented filenames and emoji never crash
    (the classic cp1252 UnicodeEncodeError).
"""

import sys
import os
import io
import json
import time
import hashlib
import argparse
from pathlib import Path

# --- Windows / cp1252 safety: force UTF-8 on stdout/stderr ---
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _file_info(p: Path):
    try:
        st = p.stat()
        return {
            "name": p.name,
            "size": st.st_size,
            "mtime": time.strftime("%Y-%m-%d %H:%M", time.localtime(st.st_mtime)),
            "ext": p.suffix.lower(),
        }
    except OSError:
        return {"name": p.name, "size": 0, "mtime": "?", "ext": p.suffix.lower()}


def _sha256(p: Path, limit_bytes=None):
    h = hashlib.sha256()
    try:
        with open(p, "rb") as f:
            while True:
                chunk = f.read(1024 * 1024)
                if not chunk:
                    break
                h.update(chunk)
                if limit_bytes and f.tell() >= limit_bytes:
                    break
        return h.hexdigest()
    except OSError:
        return None


def cmd_scan(args):
    root = Path(args.path).expanduser().resolve()
    if not root.is_dir():
        print(f"ERROR: not a directory: {root}", file=sys.stderr)
        sys.exit(2)

    categories = {}        # top-level dir -> [subdir names]
    loose_in_categories = {}
    root_files = []
    all_files = []         # (Path, info) for duplicate detection

    for entry in sorted(os.scandir(root), key=lambda e: e.name.lower()):
        p = Path(entry.path)
        if entry.name.startswith(".folder-organizer-"):
            continue  # skip this tool's own artifacts (undo files, etc.)
        if entry.is_file():
            info = _file_info(p)
            root_files.append(info)
            all_files.append((p, info))
        elif entry.is_dir():
            subdirs = []
            loose = []
            try:
                for sub in sorted(os.scandir(p), key=lambda e: e.name.lower()):
                    if sub.is_dir():
                        subdirs.append(sub.name)
                    elif sub.is_file():
                        sp = Path(sub.path)
                        info = _file_info(sp)
                        loose.append(info)
                        all_files.append((sp, info))
            except OSError:
                pass
            categories[entry.name] = subdirs
            if loose:
                loose_in_categories[entry.name] = loose

    # --- duplicate / version detection ---
    # 1) exact duplicates: same size -> confirm by hash
    by_size = {}
    for p, info in all_files:
        by_size.setdefault(info["size"], []).append(p)
    exact = []
    for size, paths in by_size.items():
        if size > 0 and len(paths) > 1:
            by_hash = {}
            for p in paths:
                hsh = _sha256(p)
                if hsh:
                    by_hash.setdefault(hsh, []).append(str(p.relative_to(root)))
            for hsh, group in by_hash.items():
                if len(group) > 1:
                    exact.append(group)

    # 2) format pairs / version siblings: same stem, different ext or _N suffix
    def norm_stem(name):
        stem = Path(name).stem.lower()
        # strip trailing version markers like " (1)", "_2", "-copy"
        for marker in [" (1)", " (2)", "_2", "_3", "-copy", " copy", " - copia", "-2"]:
            if stem.endswith(marker):
                stem = stem[: -len(marker)]
        return stem.strip()

    by_stem = {}
    for p, info in all_files:
        by_stem.setdefault(norm_stem(info["name"]), []).append(str(p.relative_to(root)))
    siblings = [sorted(g) for g in by_stem.values() if len(g) > 1]

    totals = {
        "root_files": len(root_files),
        "categories": len(categories),
        "loose_inside_categories": sum(len(v) for v in loose_in_categories.values()),
        "exact_duplicate_groups": len(exact),
        "sibling_groups": len(siblings),
    }

    result = {
        "target": str(root),
        "totals": totals,
        "categories": categories,
        "root_files": root_files,
        "loose_in_categories": loose_in_categories,
        "duplicates": {"exact": exact, "siblings": siblings},
    }

    out = json.dumps(result, ensure_ascii=False, indent=2)
    if args.json:
        Path(args.json).write_text(out, encoding="utf-8")
        print(f"Scan written to {args.json}")
        print(f"  root_files={totals['root_files']}  categories={totals['categories']}"
              f"  loose_inside={totals['loose_inside_categories']}"
              f"  exact_dups={totals['exact_duplicate_groups']}"
              f"  siblings={totals['sibling_groups']}")
    else:
        print(out)


def cmd_apply(args):
    root = Path(args.path).expanduser().resolve()
    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    # plan: list of {"src": "<relpath or abspath>", "dest": "<dest dir relpath or abspath>"}
    moves = plan if isinstance(plan, list) else plan.get("moves", [])

    undo_records = []
    ok = 0
    errs = 0
    for m in moves:
        src = Path(m["src"])
        if not src.is_absolute():
            src = root / m["src"]
        dest_dir = Path(m["dest"])
        if not dest_dir.is_absolute():
            dest_dir = root / m["dest"]

        if not src.exists():
            print(f"  -- (missing) {src}")
            errs += 1
            continue
        dest_dir.mkdir(parents=True, exist_ok=True)
        target = dest_dir / src.name
        if target.exists():
            print(f"  -- (exists, skipped) {target}")
            errs += 1
            continue
        try:
            os.replace(src, target) if src.drive == target.drive else None
            if not target.exists():
                # cross-device or replace skipped -> use move
                import shutil
                shutil.move(str(src), str(target))
            undo_records.append({"from": str(target), "to": str(src)})
            print(f"  OK  {src.name}  ->  {dest_dir}")
            ok += 1
        except Exception as e:
            print(f"  ERR {src.name}: {e}")
            errs += 1

    ts = time.strftime("%Y%m%d-%H%M%S", time.localtime())
    undo_path = root / f".folder-organizer-undo-{ts}.json"
    undo_path.write_text(json.dumps(undo_records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nMoved {ok}, skipped/errors {errs}.")
    print(f"Undo file: {undo_path}")


def cmd_undo(args):
    undo_path = Path(args.undofile)
    records = json.loads(undo_path.read_text(encoding="utf-8"))
    ok = 0
    for r in reversed(records):
        frm = Path(r["from"])
        to = Path(r["to"])
        if not frm.exists():
            print(f"  -- (missing) {frm}")
            continue
        to.parent.mkdir(parents=True, exist_ok=True)
        if to.exists():
            print(f"  -- (target exists, skipped) {to}")
            continue
        import shutil
        shutil.move(str(frm), str(to))
        print(f"  UNDO  {frm.name}  ->  {to.parent}")
        ok += 1
    print(f"\nReverted {ok} moves.")


def main():
    ap = argparse.ArgumentParser(description="folder-organizer toolkit")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("scan", help="inventory a folder")
    s.add_argument("path")
    s.add_argument("--json", help="write scan JSON to this file")
    s.set_defaults(func=cmd_scan)

    a = sub.add_parser("apply", help="execute an approved move plan")
    a.add_argument("path")
    a.add_argument("--plan", required=True, help="JSON file: list of {src,dest}")
    a.set_defaults(func=cmd_apply)

    u = sub.add_parser("undo", help="reverse a previous apply")
    u.add_argument("undofile")
    u.set_defaults(func=cmd_undo)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
