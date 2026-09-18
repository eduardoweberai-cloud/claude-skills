---
name: deep-research
description: |
  Deep, mode-specialized research with Memory Vault integration. Modes: deep (default — topic mastery),
  stack (repo/tutorial discovery), automation (process mapping + tool comparison).
  Saves to $MEMORY_VAULT/wiki/research/<YYYY-MM-DD>-<slug>.md with applied lens (vault auto-link,
  money angle, next actions, stack shortlist). Dashboard via Obsidian Dataview.
  Use this skill when the user invokes `/deep-research [mode] <query>` or asks for a deep, structured
  research with citations that should be saved to the vault for future reference.
---

# Deep Research

Mode-specialized research pipeline. Outputs to Memory Vault. Compounds knowledge instead of consuming it.

## Quick Start

```
/deep-research como automatizar emissao NFS-e 100% via Claude Code           # default: deep
/deep-research automation como automatizar emissao NFS-e 100% via Claude Code  # explicit automation mode
/deep-research stack saas multi-tenant boilerplate next.js supabase 2026       # explicit stack mode
/deep-research deep estado da arte de agentes autonomos 2026                   # explicit deep mode
```

## Activation

1. Parse `$ARGUMENTS`:
   - First whitespace-separated token: if ∈ `{deep, stack, automation}`, that's the MODE; the rest is QUERY.
   - Else MODE = `deep` (default), QUERY = entire `$ARGUMENTS` string.
   - If QUERY is empty, prompt the user: "What do you want to research? (mode default: deep)".

2. Load `modes/<MODE>.yaml` via js-yaml.
   - If file missing: ABORT with veto `VETO_MODE_UNKNOWN`. List valid modes from `modes/*.yaml` minus `_template.yaml`.

3. Resolve the vault: `$MEMORY_VAULT` if set, otherwise `~/research-vault`. Below, `$MEMORY_VAULT`
   means this resolved path. If it does not exist yet, step 4 creates it (fresh vault).

4. Check if bootstrap was run on this vault.
   - Marker: `$MEMORY_VAULT/wiki/research/.gitkeep` exists AND `## Research` section in `index.md`.
   - If missing: run `node scripts/bootstrap.js` automatically (idempotent; creates the vault if needed).
     Run `npm install` once in the skill folder before the first run. Surface a one-line notice "Bootstrapping vault for first run." to the user.

5. Execute the 7-phase pipeline (see below).

6. On success, output to user:
   - File path
   - TL;DR (first paragraph of synthesis)
   - Obsidian deep-link
   - Stats: waves, sources, coverage, money angles

---

## SKILL DEFINITION

```yaml
skill:
  name: Deep Research
  id: deep-research
  version: 0.1.0

veto_conditions:
  - id: VETO_VAULT_OFFLINE
    trigger: "Resolved vault path cannot be created or written"
    action: "STOP + Report: 'Vault path not writable. Set $MEMORY_VAULT to a folder you own.'"

  - id: VETO_MODE_UNKNOWN
    trigger: "First argument matches no mode YAML in modes/"
    action: "STOP + Report: 'Unknown mode <X>. Valid: deep, stack, automation. Use /deep-research <query> for default (deep).'"

  - id: VETO_IMPLEMENTATION_REQUEST
    trigger: "User asks to implement, code, create agent/skill, or deploy"
    action: "REDIRECT: 'Implementation is not my scope. Hand it off to your implementation workflow.'"
    keywords:
      - "implementa"
      - "cria o agent"
      - "cria a skill"
      - "faz o codigo"
      - "escreve o codigo"
      - "desenvolve"
      - "deploy"
      - "implement"
      - "build this"
      - "code this"

  - id: VETO_NO_RESULTS
    trigger: "All workers return empty sources, both waves"
    action: "STOP + Report: 'No results found. Reformulate query or check internet/proxy.'"

  - id: VETO_FORBIDDEN_PATH
    trigger: "Attempt to write outside $MEMORY_VAULT/wiki/research/, index.md, log.md, or the .bak/CLAUDE.md (during bootstrap)"
    action: "BLOCK + Error."

constraints:
  forbidden_actions:
    - NEVER implement code, agents, skills, or production artifacts
    - NEVER write to wiki/_state/, wiki/notes/, wiki/concepts/, raw/, or anywhere outside research scope
    - NEVER modify $MEMORY_VAULT/CLAUDE.md except via bootstrap.js (which backs up first)

tool_hierarchy:
  search:
    1_preferred: "Exa MCP (mcp__exa__web_search_exa)"
    2_preferred: "Context7 MCP for library-specific queries"
    3_fallback: "WebSearch (always available)"
    detection: "Try preferred first. On 401/429/503 or error, fall back to next."
  docs:
    1_preferred: "Context7 (mcp__context7__resolve-library-id + query-docs)"
    2_fallback: "WebSearch site:<docs-domain>"
  deep_read:
    only: "WebFetch with prompts/search-worker.md WebFetch prompt"
  workers:
    type: "general-purpose"
    model: "haiku"
    max_parallel: 5
    max_deep_reads_per_worker: 3
    timeout_per_worker_sec: 90

workflow:
  phases:
    0_mode_bootstrap:
      tier: MAIN_INLINE
      task: Parse args, load mode YAML, verify vault, idempotent bootstrap if needed.
    1_vault_load:
      tier: SCRIPT
      task: See tasks/01-vault-load.md
      script: scripts/vault-load.js
    2_decompose:
      tier: MAIN_ULTRATHINK
      task: See tasks/02-decompose.md
      prompt: prompts/decompose.md
    3_parallel_search:
      tier: HAIKU_VIA_TASK
      task: See tasks/03-parallel-search.md
      prompt: prompts/search-worker.md
    4_evaluate_coverage:
      tier: HAIKU_VIA_TASK
      task: See tasks/04-evaluate-coverage.md
    5_synthesize:
      tier: MAIN
      task: See tasks/05-synthesize.md
      prompt: prompts/synthesize-<mode>.md
    6_applied_lens:
      tier: MAIN_PLUS_SCRIPT
      task: See tasks/06-applied-lens.md
      prompt: prompts/applied-lens.md
      script: scripts/vault-link-projects.js
    7_document:
      tier: SCRIPT
      task: See tasks/07-document.md
      scripts: [scripts/slug-generator.js, scripts/update-index.js]

security:
  - Never expose API keys, tokens, CPFs, R$ amounts, or other secrets in research docs
  - Sanitize URLs that contain auth tokens before storing
  - NEVER write outside $MEMORY_VAULT/wiki/research/ + index.md + log.md (plus one-shot CLAUDE.md patch via bootstrap)

scope_boundaries:
  allowed_paths:
    - "$MEMORY_VAULT/wiki/research/**"
    - "$MEMORY_VAULT/index.md"
    - "$MEMORY_VAULT/log.md"
    - "$MEMORY_VAULT/CLAUDE.md (only during bootstrap, with .bak)"
    - "$MEMORY_VAULT/research-dashboard.md (only during bootstrap)"
  forbidden_paths:
    - "$MEMORY_VAULT/wiki/_state/**"
    - "$MEMORY_VAULT/wiki/notes/**"
    - "$MEMORY_VAULT/wiki/concepts/**"
    - "$MEMORY_VAULT/wiki/projects/**"
    - "$MEMORY_VAULT/wiki/clients/**"
    - "$MEMORY_VAULT/raw/**"
    - ".claude/agents/"
    - ".claude/skills/ (other than this skill)"
    - "app/, lib/, src/, packages/"
  exception: "Code examples within research markdown are allowed for DOCUMENTATION only — never executed."
```

---

## Execution Flow (visual)

```
Query → Mode Bootstrap → Vault Load (SCRIPT)
                                 |
                                 ▼
                           Decompose (MAIN+ultrathink)
                                 |
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
              Haiku worker  Haiku worker  Haiku worker  ... (max 5)
                  |              |              |
                  └──────────────┴──────────────┘
                                 |
                          Aggregate (MAIN)
                                 |
                          Evaluate Coverage (HAIKU)
                                 |
                          (coverage OK?) ── NO ──→ [Wave 2, max 2 total]
                                 | YES
                                 |
                          Synthesize (MAIN, mode-template)
                                 |
                          Applied Lens (MAIN + vault-link-projects.js)
                                 |
                          Document (SCRIPTS: slug + update-index, atomic)
                                 |
                          Output: path + TL;DR + Obsidian URI
```

---

## What this skill does NOT do

- No ETL service dependency.
- No Bash subshells beyond `gh api` for stack enrichment.
- No Python.
- No vector store. The vault is markdown-only.
- Dashboard is Obsidian Dataview only.
- No multi-vault. Assumes single `$MEMORY_VAULT`.
- No production code generation. Veto enforces this.

---

## Output structure

```
$MEMORY_VAULT/wiki/research/<YYYY-MM-DD>-<slug>.md   # the research entry
$MEMORY_VAULT/index.md                                # auto-updated with new entry row
$MEMORY_VAULT/log.md                                  # auto-appended with timestamp + summary
$MEMORY_VAULT/research-dashboard.md                   # auto-aggregated via Dataview (no code change)
```
