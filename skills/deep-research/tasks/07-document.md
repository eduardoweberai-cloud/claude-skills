# Task 07 — Document

**Tier:** Script
**Purpose:** Atomic save of research entry + update vault index + log.

## Steps

1. **Generate slug:**
   ```
   const slug = generateSlug(MAIN_QUERY, new Date());
   ```
   Result: `2026-05-12-nfse-automacao-claude-code`.

2. **Build frontmatter** with all required fields:
   - title (from synthesis H1)
   - type: research
   - slug
   - created / updated (ISO 8601)
   - status: active
   - research_mode (from current mode)
   - research_query (literal MAIN_QUERY)
   - research_waves (1 or 2)
   - research_duration_sec
   - coverage_score
   - sources_total / sources_by_credibility
   - linked_projects / linked_concepts (from Task 06's LINKED_PAGES)
   - linked_clients (from Task 01's known_clients)
   - known_from_vault (from Task 02 decompose output)
   - supersedes / superseded_by (from cross-research detection)
   - process_complexity / tools_found / repos_count (mode-specific)
   - money_angles_count / next_actions_count / has_stack_shortlist (counted from applied lens)
   - tags (from search keywords + mode)
   - skill_version: deep-research-v0.1

3. **Render the file** with `scripts/render-template.js` + `templates/research-entry.md`:
   ```js
   import { renderTemplate } from './scripts/render-template.js';
   import fs from 'node:fs/promises';
   const template = await fs.readFile('templates/research-entry.md', 'utf-8');
   const { rendered, missing } = renderTemplate(template, {
     title, slug, created, updated, status,
     research_mode, research_query, research_waves, research_duration_sec,
     coverage_score, sources_total,
     sources_high, sources_medium, sources_low,
     // arrays via _yaml suffix → serialized as inline YAML
     linked_projects_yaml: linked_projects,
     linked_concepts_yaml: linked_concepts,
     linked_clients_yaml: linked_clients,
     known_from_vault_yaml: known_from_vault,
     supersedes_yaml: supersedes,
     superseded_by,
     // mode-specific block: pre-format as raw YAML string (e.g.,
     // "process_complexity: medium\ntools_found: 7\nrepos_count: 3" for automation)
     mode_specific_yaml,
     money_angles_count, next_actions_count, has_stack_shortlist,
     tags_yaml: tags,
     skill_version: 'deep-research-v0.1',
     research_duration_human,        // e.g., "3min 7s"
     body,                           // raw markdown (synthesis + applied lens)
   });
   if (missing.length > 0) console.warn(`template placeholders left empty: ${missing.join(', ')}`);
   ```
   The `_yaml` suffix on a key tells `renderTemplate` to serialize the value as YAML-inline (arrays become `[a, b, c]`). `body` is treated as raw markdown (no escaping).

4. **Cross-research check** (optional — supersedes detection):
   - Scan `$MEMORY_VAULT/wiki/research/*.md` for entries with overlapping tags/topic
   - If Jaccard similarity ≥ 0.7 with an entry created earlier → patch the OLD entry's frontmatter to set `superseded_by: [[new-slug]]`. Do not delete the old markdown.

5. **Atomic save:**
   ```
   const entryPath = path.join(MEMORY_VAULT, 'wiki/research', `${slug}.md`);
   await atomicWrite(entryPath, fileContent);
   ```

6. **Update index and log:**
   ```
   await updateIndex(MEMORY_VAULT, {
     slug,
     mode: MODE,
     topic: titleFromSynthesis,
     linkedSummary: [...linked_projects.slice(0,2), ...linked_concepts.slice(0,2)].join(', ')
   });
   ```

7. **Output to user:**
   - File path: `<absolute path to .md>`
   - TL;DR (first paragraph of synthesis)
   - Obsidian deep-link: `obsidian://open?vault=<nome-da-pasta-do-vault>&file=wiki/research/<slug>`

## Failure handling

- Slug collision (exists same date+slug): append `-1`, `-2`, etc.
- Atomic write fails: research is NOT in vault, abort cleanly, no partial state.
- Index update fails AFTER successful entry write: research file stays in vault; manual reindex via `node scripts/update-index.js` is documented in error message.
