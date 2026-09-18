# Task 04 — Evaluate Coverage

**Tier:** Haiku via Task tool
**Purpose:** Decide CONTINUE (another wave) or STOP. Hard cap 2 waves total.

## Steps

1. Dispatch a Haiku Task with the aggregated search_results + MAIN_QUERY + sub_queries.

2. Worker computes:
   - `coverage_score` (0-100): How well do findings answer MAIN_QUERY? Heuristic: sum of (high-credibility sources × angle coverage / total angles).
   - `source_quality`: counts by tier
     - `high_count`, `medium_count`, `low_count`
   - `gaps`: list of angles or aspects insufficiently covered

3. Apply stop rules (in order):

   **HARD STOPS:**
   - `wave >= 2` → STOP, reason `max_iterations_reached`
   - `coverage_score >= mode.evaluate.min_coverage_to_stop` AND `high_count >= mode.evaluate.min_high_credibility_sources` → STOP, reason `sufficient_coverage`

   **SOFT STOP:**
   - `coverage_score >= 65` AND `wave >= 1` → STOP, reason `acceptable_coverage`

   **MUST CONTINUE:**
   - `coverage_score < 50` AND `wave == 1` → CONTINUE, generate 2-3 gap-filling queries.

4. **Mode-specific checks** (from `<mode>.yaml`.evaluate.mode_specific_checks):
   - For each rule: evaluate. If `on_fail` says `continue_with_*_queries`, override STOP to CONTINUE.

5. **If CONTINUE:** generate 2-3 new sub_queries targeting `gaps`. Pass to Task 03 for a second wave. Track `wave_count += 1`.

6. **If STOP:** pass aggregated search_results to Task 05.

## Output

```json
{
  "decision": "STOP" | "CONTINUE",
  "coverage_score": 78,
  "source_quality": { "high_count": 4, "medium_count": 5, "low_count": 2 },
  "stop_reason": "sufficient_coverage",
  "gaps": [...],
  "next_queries": [...]  // only if CONTINUE
}
```
