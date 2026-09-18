# Task 01 — Vault Load

**Tier:** Script + Main inline
**Purpose:** Load existing knowledge from Memory Vault before web research. Avoids duplicating what user already documented. Enables vault-aware decomposition and applied-lens auto-linking.

## Steps

1. Resolve the vault: `$MEMORY_VAULT` if set, else `~/research-vault` (bootstrap creates it). Not writable: ABORT with veto `VETO_VAULT_OFFLINE`.

2. Read `<mode>.yaml` → `vault_load.scopes`, `vault_load.exclude`, `vault_load.max_pages`.

3. Extract keywords from MAIN_QUERY via `extractKeywords` (from `scripts/vault-load.js`).

4. Call `vaultLoad(MEMORY_VAULT, keywords, options)` to get:
   - `index_summary` (first 800 chars of index.md)
   - `relevant_pages` (top N with title/type/score/snippet/frontmatter)
   - `known_projects`, `known_concepts`, `known_clients` (as `[[wiki-link]]` arrays)

5. Pass the full JSON forward to Task 02 (decompose) and Task 06 (applied-lens).

## Failure modes

- **Vault path missing/inaccessible:** ABORT, do not fall back to web-only search. Better fail-fast than silently produce duplicate research.
- **Zero matches:** OK — continue with empty `relevant_pages`. Web search will do the work.
- **Index.md missing:** OK — `index_summary` empty string. Continue.

## Output schema

```json
{
  "index_summary": "<first 800 chars or empty>",
  "relevant_pages": [
    { "path": "wiki/concepts/...", "title": "...", "type": "concept", "score": 0.42, "snippet": "...", "frontmatter": {...} }
  ],
  "known_projects": ["[[painel]]"],
  "known_concepts": ["[[nfse-playbook]]"],
  "known_clients": []
}
```
