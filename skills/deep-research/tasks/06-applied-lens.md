# Task 06 — Applied Lens

**Tier:** Main model + script
**Purpose:** Generate the section that transforms research into compounding capital. Vault auto-link + money angle + next actions + (conditional) stack shortlist.

## Steps

1. **Run `vault-link-projects.js`** with SYNTHESIS_BODY + vaultPath:
   ```
   const { projects, concepts } = await findLinkedPages(MEMORY_VAULT, synthesisBody);
   ```
   Returns `{ projects: ['[[painel]]', ...], concepts: ['[[nfse-playbook]]', ...] }`.

2. **Read active projects** from `$MEMORY_VAULT/wiki/_state/now.md` (or filesystem scan of `wiki/projects/*.md` with frontmatter `status: active`).

3. **Load `prompts/applied-lens.md`** and bind:
   - MAIN_QUERY
   - MODE
   - SYNTHESIS_BODY (output of Task 05)
   - VAULT_CONTEXT (from Task 01)
   - LINKED_PAGES (step 1 above)
   - STACK_SHORTLIST (from Task 05's stack_enrichment, if applicable)
   - ACTIVE_PROJECTS (step 2 above)
   - MONEY_ANGLE_DIMENSIONS (from `<mode>.yaml`.applied_lens.money_angle_dimensions, default 5)

4. **Invoke main model** with the rendered prompt.

5. **Validate output:**
   - "Vault Context" section present
   - "Money Angle" section has EXACTLY MONEY_ANGLE_DIMENSIONS entries (or admits fewer)
   - "Next Actions" has 3-5 checkboxes
   - "Stack Shortlist" present IFF mode ∈ {stack, automation} AND STACK_SHORTLIST has ≥1 entry
   - Every TODO mentions a project from ACTIVE_PROJECTS (or is a spike — i.e., starts with "Spike")

6. **Post-process: inline backlinks.** Run `addInlineBacklinks(synthesisBody, [...projects, ...concepts])` to convert first plain-text mentions to `[[wiki-links]]` (preserves existing brackets). Apply to body BEFORE applied lens is appended (applied lens already has bracketed links from the prompt).

## Output

Final markdown body = `synthesis_with_inline_links + "\n\n" + applied_lens_section`.
