# deep-research

Mode-specialized research skill for Claude Code. Saves to Memory Vault. Compounds knowledge.

## What it does

Runs a 7-phase pipeline against a user query:

1. **Vault Load** — reads `$MEMORY_VAULT/wiki/` for what you already know
2. **Decompose** (ultrathink) — 5-7 orthogonal sub-queries, vault-aware
3. **Parallel Search** — 5 Haiku workers (WebSearch + WebFetch) in parallel
4. **Evaluate Coverage** — STOP / CONTINUE decision, max 2 waves
5. **Synthesize** — mode-specific template (deep / stack / automation)
6. **Applied Lens** — vault auto-link + money angle + next actions + (optional) stack shortlist
7. **Document** — atomic save to `wiki/research/` + index update

Output: `$MEMORY_VAULT/wiki/research/<YYYY-MM-DD>-<slug>.md`.

## Modes

- `deep` (default) — topic mastery, citation rigor, comparison matrix
- `stack` — clonable repos + tutorials + effort estimate
- `automation` — process map + existing tools + maintenance cost

## Usage

```
/deep-research <query>                         # default: deep
/deep-research deep <query>                    # explicit deep
/deep-research stack <query>                   # stack mode
/deep-research automation <query>              # automation mode
```

## Prerequisites

- Node.js 20+ and `npm install` once in this folder.
- Optional: `$MEMORY_VAULT` env var pointing to an existing Obsidian vault. Without it, the skill creates and uses `~/research-vault`.
- Optional: Obsidian Dataview plugin (for dashboard rendering).
- Optional: `gh` CLI authenticated (for stack-evaluator.js — GitHub repo enrichment).

## Setup

First run auto-bootstraps (creating the vault if it does not exist):
- Adds `- research` to `$MEMORY_VAULT/CLAUDE.md` types list (backup `.research-bootstrap.bak`)
- Creates `$MEMORY_VAULT/wiki/research/`
- Creates `$MEMORY_VAULT/research-dashboard.md`

Manual bootstrap: `node scripts/bootstrap.js` (or `--dry-run` to preview).

## Dashboard

Open `$MEMORY_VAULT/research-dashboard.md` in Obsidian. Dataview renders:
- TL;DR stats (count, money angles total, actions total)
- Recent researches
- By mode (deep / stack / automation tables)
- Money Angle Forte (≥ 3 angles)
- Per active project
- TODO Geral (aggregated from all `- [ ]` in research entries)
- Superseded history

## Testing

```bash
cd ~/.claude/skills/deep-research
npm test                                       # all unit tests
node --test "tests/slug-generator.test.js"     # individual file
```

Current status: 48/48 tests passing.

## Architecture

See `~/.claude/plans/2026-05-12-deep-research-skill-design.md` for full design doc and `~/.claude/plans/2026-05-12-deep-research-skill-implementation.md` for the implementation plan.

## Versioning

- `v0.X` — bug fixes, prompt tuning, mode additions
- `v1.0` — after 5+ real researches without structural change

## Adding a new mode

```bash
cp modes/_template.yaml modes/<your-mode>.yaml
# Edit modes/<your-mode>.yaml — id, sources_priority, required_sections
# Create prompts/synthesize-<your-mode>.md
# Re-run /deep-research <your-mode> <query>
```

No code changes needed.

## File structure

```
~/.claude/skills/deep-research/
├── SKILL.md                # entry point (orchestration + veto)
├── package.json            # deps + scripts
├── modes/                  # YAML configs (deep, stack, automation)
├── tasks/                  # per-phase operational specs (01-07)
├── prompts/                # LLM prompt strings (decompose, search-worker, synthesize-*, applied-lens)
├── templates/              # output templates (research-entry, index-line, dashboard)
├── scripts/                # Node helpers (vault-load, vault-link, update-index, slug-gen, stack-eval, bootstrap)
├── tests/                  # unit tests + sample-vault fixture
└── data/                   # trusted-sources.yaml
```
