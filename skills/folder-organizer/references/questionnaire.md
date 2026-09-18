# Upfront Questionnaire + Profile Schema

The whole point of this skill is to **ask before acting**. Run the questionnaire
at the start of every session, BEFORE scanning or moving anything. On repeat
runs, a saved profile shortens it to a quick confirmation.

## Profile storage

Profiles persist per target folder at:

```
~/.claude/folder-organizer/profiles/<slug>.json
```

`<slug>` = the target folder path, lowercased, non-alphanumeric replaced by `-`
(e.g. `c-users-voce-downloads`). The script does not manage profiles; the agent
reads/writes this JSON directly.

### Profile schema

```json
{
  "target": "~/Downloads",
  "taxonomy": ["ESTUDOS", "FINANCEIRO", "MIDIA", "PESSOAL", "PROFISSIONAL", "TECNOLOGIA"],
  "rules": [
    "Files mentioning 'clientex' -> PROFISSIONAL/ClienteX",
    "Files mentioning 'clientey' -> PROFISSIONAL/ClienteY",
    "Boletos (long numeric filename) -> FINANCEIRO/Boletos",
    "Transcricoes/conversas -> PROFISSIONAL/Transcricoes"
  ],
  "ambiguous_policy": "ask",          // ask | leave | triage
  "approval_gate": "plan-and-go",     // plan-and-go | execute
  "scope_default": "root+subfolders", // root | root+subfolders | full
  "duplicates_policy": "show-first",  // show-first | archive | keep
  "never_touch": ["MIDIA/Fotos", "ESTUDOS/Faculdade"],
  "keep_format_pairs": true,
  "updated": "2026-06-25"
}
```

## Question bank

Ask the most relevant first; never dump all at once. Skip any question whose
answer is already in the saved profile (just confirm the profile in one line).

### Always ask (first run AND when no profile)
1. **Which folder?** (default: Downloads at `~/Downloads`)
2. **Scope:** only loose files at the root, root + loose files inside category
   subfolders, or a full sweep of the whole tree?
3. **Taxonomy:** keep the existing top-level folders as-is, or revise them?
   (Show the detected top-level folders so the user reacts to something concrete.)

### Ask on first run, then save to profile
4. **Approval gate:** always show the full plan (file -> destination) and wait
   for GO before moving? (default yes)
5. **Ambiguous files:** list-and-ask one by one / leave in place and report /
   move to a `_TRIAGEM` folder?
6. **Duplicates:** show suspected duplicates before doing anything / move older
   versions to `_ARQUIVO` / leave them all?
7. **Anything off-limits?** Folders the skill must never touch (e.g. a photo library,
   a synced project folder).

### Ask only when relevant to what the scan found
8. When a cluster of files clearly belongs to a project with no existing folder
   (e.g. several "Evento Anual 2026" files) -> "Create a dedicated subfolder for X?"
9. When format pairs are found (`.docx` + `.pdf` of the same doc) -> confirm
   "keep both together" (default) vs. keep only one.
10. When the target folder is huge (>10 GB) -> "Want me to also flag big files
    that could be archived/deleted to free space?"

## Confirmation line for repeat runs

When a profile exists, replace questions 4-7 with a single confirmation, e.g.:

> Achei seu perfil salvo da Downloads (taxonomia de 6 pastas, ambíguos = perguntar,
> sempre mostro o plano antes, nunca toco em MIDIA/Fotos). Mantenho assim? (sim / ajustar)

Only re-ask the items the user wants to change.
