"""Memória entre sessões em markdown local.

Uso:
  mem.py save   --project P --title T [--tags a,b] --body-file F
  mem.py learn  --project P --title T [--tags a,b] --body-file F
  mem.py recent [--project P] [-n 3]
  mem.py search TERMO

Pasta: $AGENT_MEMORY_DIR ou ~/.agent-memory
"""
import argparse
import os
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

INDEX_HEADER = "# Memória\n\n| data | tipo | projeto | título | arquivo |\n|---|---|---|---|---|\n"


def base_dir() -> Path:
    d = Path(os.environ.get("AGENT_MEMORY_DIR") or Path.home() / ".agent-memory")
    (d / "sessions").mkdir(parents=True, exist_ok=True)
    (d / "facts").mkdir(parents=True, exist_ok=True)
    idx = d / "index.md"
    if not idx.exists():
        idx.write_text(INDEX_HEADER, encoding="utf-8")
    return d


def slugify(s: str, max_len: int = 60) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:max_len].strip("-") or "registro"


def cell(s: str) -> str:
    return s.replace("|", "/").replace("\n", " ").strip()


def write_entry(kind: str, a) -> Path:
    d = base_dir()
    body = Path(a.body_file).read_text(encoding="utf-8").strip()
    now = datetime.now()
    tags = [t.strip() for t in (a.tags or "").split(",") if t.strip()]
    if kind == "session":
        path = d / "sessions" / f"{now:%Y-%m-%d-%H%M}-{slugify(a.title)}.md"
        n = 2
        while path.exists():  # sessão nunca sobrescreve outra
            path = path.with_name(f"{now:%Y-%m-%d-%H%M}-{slugify(a.title)}-{n}.md")
            n += 1
    else:
        path = d / "facts" / f"{slugify(a.title)}.md"
    front = (
        "---\n"
        f"type: {kind}\n"
        f"project: {a.project}\n"
        f"title: \"{a.title.replace(chr(34), chr(39))}\"\n"
        f"date: {now:%Y-%m-%d %H:%M}\n"
        f"tags: [{', '.join(tags)}]\n"
        "---\n\n"
    )
    existed = path.exists()
    path.write_text(front + f"# {a.title}\n\n{body}\n", encoding="utf-8")

    rel = path.relative_to(d).as_posix()
    idx = d / "index.md"
    lines = idx.read_text(encoding="utf-8").splitlines(keepends=True)
    row = f"| {now:%Y-%m-%d} | {kind} | {cell(a.project)} | {cell(a.title)} | [{rel}]({rel}) |\n"
    if existed:  # fato atualizado: troca a linha em vez de duplicar
        lines = [row if f"]({rel})" in l else l for l in lines]
    else:
        lines.append(row)
    idx.write_text("".join(lines), encoding="utf-8")
    return path


def index_rows(d: Path):
    rows = []
    for l in (d / "index.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\w+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*\[(.*?)\]", l)
        if m:
            rows.append(dict(date=m[1], kind=m[2], project=m[3], title=m[4], file=m[5]))
    return rows


def cmd_recent(a):
    d = base_dir()
    rows = index_rows(d)
    if a.project:
        rows = [r for r in rows if r["project"].lower() == a.project.lower()]
    sessions = [r for r in rows if r["kind"] == "session"][-a.n:]
    facts = [r for r in rows if r["kind"] == "fact"]
    if not sessions and not facts:
        print("Nenhum registro ainda" + (f" para o projeto '{a.project}'." if a.project else "."))
        return
    print("SESSÕES (mais antiga -> mais recente):")
    for r in sessions:
        print(f"  {r['date']}  {r['title']}  ->  {d / r['file']}")
    if facts:
        print("FATOS:")
        for r in facts:
            print(f"  {r['title']}  ->  {d / r['file']}")


def cmd_search(a):
    d = base_dir()
    term = a.term.lower()
    hits = 0
    for p in sorted((d / "sessions").glob("*.md")) + sorted((d / "facts").glob("*.md")):
        text = p.read_text(encoding="utf-8")
        if term in text.lower():
            hits += 1
            first = next((l for l in text.splitlines() if term in l.lower()), "")
            print(f"{p}\n    {first.strip()[:160]}")
    if not hits:
        print(f"Nada encontrado para '{a.term}'.")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Memória entre sessões (markdown local)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("save", "learn"):
        s = sub.add_parser(name)
        s.add_argument("--project", required=True)
        s.add_argument("--title", required=True)
        s.add_argument("--tags", default="")
        s.add_argument("--body-file", required=True)
    r = sub.add_parser("recent")
    r.add_argument("--project")
    r.add_argument("-n", type=int, default=3)
    s = sub.add_parser("search")
    s.add_argument("term")
    a = ap.parse_args(argv)

    if a.cmd == "save":
        print(f"Sessão salva: {write_entry('session', a)}")
    elif a.cmd == "learn":
        print(f"Fato salvo: {write_entry('fact', a)}")
    elif a.cmd == "recent":
        cmd_recent(a)
    else:
        cmd_search(a)


if __name__ == "__main__":
    sys.exit(main())
