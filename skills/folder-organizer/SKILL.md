---
name: folder-organizer
description: "Organiza um diretório bagunçado (default: Downloads) classificando arquivos soltos numa taxonomia de pastas existente ou acordada. Use quando pedirem 'organizar/arrumar a pasta Downloads', 'organize my Downloads/Desktop/folder', 'limpar essa pasta', 'clean up this directory', 'sort these files' ou qualquer pedido de arrumar pasta. Sempre roda questionário e mostra plano completo de moves ANTES de tocar em arquivo; nunca deleta sem confirmação; memoriza taxonomia e preferências."
---

# Folder Organizer

Tidy a messy directory by moving loose files into a clear folder taxonomy. Built
to be **conservative and consultative**: ask first, plan visibly, move only on
approval, and make every action reversible.

## Operating principles (non-negotiable)

1. **Ask before acting.** Run the questionnaire at the start of every session.
   Never scan-and-move in one shot.
2. **Plan, then GO.** Always present the complete move plan (each file ->
   destination) and wait for explicit approval before moving anything.
3. **Never guess silently.** Files that cannot be classified with confidence go
   to an ambiguous list and are handled per the user's chosen policy.
4. **Never delete without confirmation.** Default is to move, not remove.
   Duplicates are shown first; deletion needs an explicit yes.
5. **Reversible.** Moves are executed via the script, which writes an undo file.

## Workflow

### Phase 0 — Load profile & questionnaire
- Compute the profile slug for the target folder and look for
  `~/.claude/folder-organizer/profiles/<slug>.json`.
- If a profile exists, confirm it in one line and only re-ask what changes.
- If not, run the first-run questionnaire.
- Question bank, profile schema, and storage path: see
  [references/questionnaire.md](references/questionnaire.md). Use the
  `AskUserQuestion` tool for the key multiple-choice decisions; keep it to a few
  questions per message.

### Phase 1 — Scan (deterministic)
Run the scanner (Windows-safe UTF-8; handles accented filenames):

```bash
PYTHONUTF8=1 python -X utf8 "<skill-dir>/scripts/organize.py" scan "<target>" --json "<tmp>/scan.json"
```

The scan reports: existing top-level categories and their subfolders (valid
destinations), loose files at the root, loose files inside each category, and
duplicate candidates (`exact` = same content; `siblings` = format/version pairs).
Read the JSON; do not re-walk the tree by hand.

### Phase 2 — Classify & build the plan
- Map each loose file to a destination using the saved `rules` first, then
  [references/classification-heuristics.md](references/classification-heuristics.md).
- Split into: **confident moves** and **ambiguous** (handled per policy).
- Propose at most one new subfolder per clear project cluster that lacks a home.
- Present the plan grouped by destination, plus: the ambiguous list (with a guess
  each), the duplicate/sibling findings, and anything intentionally left in place.

### Phase 3 — Approve
- Wait for the user's GO. For ambiguous files, collect decisions in one batch.
- Resolve duplicates only after explicit confirmation (default: keep format pairs
  together, never delete).

### Phase 4 — Apply (reversible)
Write the approved plan to a JSON file (`[{"src": "...", "dest": "..."}, ...]`;
`dest` is the destination FOLDER, not the file path; `src`/`dest` may be relative to the target) and run:

```bash
PYTHONUTF8=1 python -X utf8 "<skill-dir>/scripts/organize.py" apply "<target>" --plan "<tmp>/plan.json"
```

This creates destination dirs, moves with no-overwrite, never deletes, and writes
`.folder-organizer-undo-<timestamp>.json` in the target. To reverse:

```bash
PYTHONUTF8=1 python -X utf8 "<skill-dir>/scripts/organize.py" undo "<target>/.folder-organizer-undo-<timestamp>.json"
```

### Phase 5 — Save profile & report
- Update/create the profile JSON with the confirmed taxonomy, any new rules
  learned this run, and the chosen policies.
- Report: counts moved, new folders created, files left in place, duplicates
  found, and the undo-file path.

## Notes
- Default target when the user names none: the user's Downloads folder (`~/Downloads`).
- Respect `never_touch` entries in the profile (e.g. large media folders).
- When stating any path back to the user, give the full absolute path.
- The script never decides classifications — that is the agent's job, gated by
  user approval.
