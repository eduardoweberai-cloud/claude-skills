# Task 05 — Synthesize

**Tier:** Main model
**Purpose:** Consolidate aggregated findings into the structured report per the mode's template.

## Steps

1. Load `prompts/synthesize-<mode>.md` (where mode is the current mode from Task 0).

2. Bind inputs:
   - MAIN_QUERY
   - VAULT_CONTEXT (from Task 01)
   - SEARCH_RESULTS (aggregated from Task 03 + any 2nd wave)
   - COVERAGE_SCORE (from Task 04)
   - STACK_ENRICHMENT (only if mode ∈ {stack, automation}; populated via parallel calls to `scripts/stack-evaluator.js` on each GitHub URL found in search_results)

3. Invoke main model with the rendered prompt.

4. Validate output has all REQUIRED_SECTIONS from `<mode>.yaml`.synthesize.required_sections. If a section is missing, regenerate with corrective prompt (1 retry).

5. **Stack enrichment side-quest** (only for stack/automation):
   - Extract all `github.com/X/Y` URLs from search_results.sources
   - For each, call `evaluateRepo(url)` in parallel
   - Merge results into a `stack_enrichment` array
   - Pass to applied-lens (Task 06) for Stack Shortlist section

## Output

Synthesized markdown body (without applied lens yet). Required sections present and verified.
