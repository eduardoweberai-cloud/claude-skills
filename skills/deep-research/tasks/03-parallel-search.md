# Task 03 — Parallel Search

**Tier:** Haiku workers via Task tool
**Purpose:** Execute each sub-query as an independent Haiku worker that searches + deep-reads + returns raw findings.

## Steps

1. **Pre-check MCP availability** (main model, before dispatch):
   - Try `mcp__context7__resolve-library-id` on the most prominent domain term. If error, set `context7_available = false`.
   - Try `mcp__exa__web_search_exa("test", 1)`. If 401/429/503, set `exa_available = false`.
   - Else both `true`.

2. **Dispatch workers** — for EACH `sub_query`, create a `Task` call:

   ```
   Task(
     subagent_type: "general-purpose",
     model: "haiku",
     prompt: <render of prompts/search-worker.md with bindings>
   )
   ```

   Render bindings:
   - SUB_QUERY = current sub_query.q
   - CONTEXT = `{ focus: <derived>, temporal: <derived>, domain: <derived> }`
   - MCP_AVAILABILITY = `{ exa: <bool>, context7: <bool> }`
   - SOURCES_PRIORITY, SOURCES_BOOST, SOURCES_BLOCK = from `<mode>.yaml`.search

   **Dispatch ALL Task calls in a SINGLE message** so they run in parallel. Max 5 workers (cap from `<mode>.yaml`.search.workers).

   If `sub_queries.length > workers`, queue the rest for a 2nd batch.

3. **Collect results.** Each worker returns JSON `{ sub_query, sources, key_findings, code_examples, expert_quotes }`. Parse all.

4. **Aggregate.** Build unified `search_results`:
   - Deduplicate by URL (keep entry with highest credibility tier)
   - Merge `key_findings` arrays
   - Merge `code_examples`
   - Merge `expert_quotes`
   - Track `tools_used` counts: `{ exa, context7, websearch, webfetch }`

5. **Failure handling.** For workers that:
   - Returned non-JSON: log warning, run that sub_query inline in main context as fallback.
   - Returned empty `sources`: count as success but note in `worker_stats.empty`.
   - Threw error: log, count as `worker_stats.failed`.
   - **RULE:** require ≥1 worker with ≥1 source — otherwise dispatch veto `VETO_NO_RESULTS`.

## Output

```json
{
  "search_results": [...aggregated workers' findings...],
  "tools_used": {"exa": N, "context7": N, "websearch": N, "webfetch": N},
  "worker_stats": {"dispatched": N, "succeeded": N, "empty": N, "failed": N}
}
```
