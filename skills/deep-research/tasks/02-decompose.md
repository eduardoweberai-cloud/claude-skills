# Task 02 — Decompose

**Tier:** Main model with ultrathink
**Purpose:** Turn one user query into 5-7 orthogonal sub-queries, vault-aware (skips what user already knows).

## Steps

1. Read `prompts/decompose.md`.

2. Construct the prompt with:
   - MAIN_QUERY = user input (literal)
   - MODE = current mode (deep / stack / automation)
   - REQUIRED_ANGLES = `<mode>.yaml` → `decompose.required_angles`
   - VAULT_CONTEXT = JSON from Task 01

3. Invoke main model inline with extended thinking (`ultrathink` directive in prompt).

4. Validate the response:
   - Must be valid JSON
   - Must contain `main_topic`, `known_from_vault`, `gaps_to_research`, `sub_queries`
   - `sub_queries.length` ∈ [5, 7]
   - Every required_angle appears in at least one sub-query's `angle` field
   - Each `sub_queries[i].q` ≤ 80 chars

5. If validation fails: ONE retry with corrective prompt ("Your previous output failed validation: <reason>. Regenerate."). If still fails, ABORT with veto.

## Output: validated JSON, passed to Task 03.
