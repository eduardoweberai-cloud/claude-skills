import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DASHBOARD_CONTENT = `---
title: Research Dashboard
type: dashboard
---

# Research Dashboard

> Hub de todas as pesquisas geradas via \`/deep-research\`. Gerado por Dataview — atualiza sozinho.

## TL;DR Stats

\`\`\`dataviewjs
const all = dv.pages('"wiki/research"').where(p => p.type === "research" && p.status !== "archived");
const byMode = all.groupBy(p => p.research_mode);
const totalMoneyAngles = all.array().reduce((s, p) => s + (p.money_angles_count || 0), 0);
const totalActions = all.array().reduce((s, p) => s + (p.next_actions_count || 0), 0);
dv.paragraph(\`**\${all.length}** researches | **\${totalMoneyAngles}** money angles geradas | **\${totalActions}** next actions\`);
dv.paragraph(\`Por mode: \${byMode.map(g => \`\${g.key}: \${g.rows.length}\`).array().join(' · ')}\`);
\`\`\`

## Pesquisas Recentes (top 10)

\`\`\`dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", coverage_score AS "Score", sources_by_credibility.high AS "HIGH src", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND status != "archived"
SORT created DESC
LIMIT 10
\`\`\`

## Por Mode

### Deep
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Topic", coverage_score AS "Score", length(linked_projects) AS "Projects", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND research_mode = "deep" AND status != "archived"
SORT created DESC
\`\`\`

### Stack
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Topic", repos_count AS "Repos", has_stack_shortlist AS "Shortlist?", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND research_mode = "stack" AND status != "archived"
SORT created DESC
\`\`\`

### Automation
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Topic", process_complexity AS "Complexity", tools_found AS "Tools", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND research_mode = "automation" AND status != "archived"
SORT created DESC
\`\`\`

## Money Angle Forte (3+ angles)

\`\`\`dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", money_angles_count AS "Angles", join(linked_projects, ", ") AS "Aplicável em"
FROM "wiki/research"
WHERE type = "research" AND money_angles_count >= 3 AND status != "archived"
SORT money_angles_count DESC
\`\`\`

## Por Projeto Ativo

### [[painel]]
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", next_actions_count AS "Actions"
FROM "wiki/research"
WHERE type = "research" AND contains(linked_projects, "[[painel]]")
SORT created DESC
\`\`\`

### [[meu-crm]]
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", next_actions_count AS "Actions"
FROM "wiki/research"
WHERE type = "research" AND contains(linked_projects, "[[meu-crm]]")
SORT created DESC
\`\`\`

> **Adicionar projeto novo:** copie um bloco acima, troque o \`[[slug]]\`.

## TODO Geral

\`\`\`dataviewjs
const researches = dv.pages('"wiki/research"').where(p => p.type === "research" && p.status !== "archived");
const tasks = [];
for (const r of researches.array()) {
  for (const t of r.file.tasks.array()) {
    if (!t.completed) tasks.push({ text: t.text, page: r.file.link, mode: r.research_mode });
  }
}
if (tasks.length === 0) dv.paragraph("✅ Nenhuma next action pendente.");
else dv.table(["Action", "Pesquisa", "Mode"], tasks.map(t => [t.text, t.page, t.mode]));
\`\`\`

## Superseded

\`\`\`dataview
TABLE WITHOUT ID file.link AS "Antiga", superseded_by AS "Substituída por", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND superseded_by != null
SORT created DESC
\`\`\`

---
*Auto-rendered via Dataview. Skill \`/deep-research\` cria entries em \`wiki/research/\`.*
`;

const NEW_VAULT_CLAUDE = `# Research Vault

Pasta das pesquisas geradas pela skill \`/deep-research\`. Abra esta pasta como
vault no Obsidian (com o plugin Dataview) para ver o \`research-dashboard.md\`.

types:
    - research
`;

function appendResearchTypeToYamlList(claudeContent) {
  const lines = claudeContent.split('\n');
  let idx = lines.findIndex(l => /^\s*types:\s*$/.test(l));
  if (idx === -1) {
    return { content: claudeContent, changed: false, reason: 'no types: block' };
  }
  let lastListIdx = idx;
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^\s*-\s+\S+/.test(lines[i])) { lastListIdx = i; continue; }
    if (lines[i].trim() === '') continue;
    break;
  }
  const indentMatch = lines[lastListIdx].match(/^(\s*-\s+)/);
  const indent = indentMatch ? indentMatch[1] : '    - ';
  const block = lines.slice(idx, lastListIdx + 1).join('\n');
  if (/^\s*-\s*research\s*$/m.test(block)) {
    return { content: claudeContent, changed: false, reason: 'already present' };
  }
  lines.splice(lastListIdx + 1, 0, `${indent}research`);
  return { content: lines.join('\n'), changed: true, reason: 'added' };
}

export async function bootstrap(vaultPath, options = {}) {
  const dryRun = !!options.dryRun;
  const actions = [];
  const claudePath = path.join(vaultPath, 'CLAUDE.md');
  let claude;
  try { claude = await fs.readFile(claudePath, 'utf-8'); }
  catch (err) {
    if (!options.create) throw new Error(`$MEMORY_VAULT/CLAUDE.md not found at ${claudePath}: ${err.message}`);
    // Vault novo: cria a pasta e um CLAUDE.md mínimo com a lista de types
    actions.push('create vault + CLAUDE.md');
    claude = NEW_VAULT_CLAUDE;
    if (!dryRun) {
      await fs.mkdir(vaultPath, { recursive: true });
      await fs.writeFile(claudePath, claude, 'utf-8');
    }
  }

  const { content, changed, reason } = appendResearchTypeToYamlList(claude);
  if (changed) {
    actions.push(`patch CLAUDE.md: add 'research' to types list`);
    if (!dryRun) {
      await fs.writeFile(`${claudePath}.research-bootstrap.bak`, claude, 'utf-8');
      await fs.writeFile(claudePath, content, 'utf-8');
    }
  } else {
    actions.push(`CLAUDE.md unchanged (${reason})`);
  }

  const researchDir = path.join(vaultPath, 'wiki', 'research');
  try { await fs.access(researchDir); actions.push('wiki/research/ already exists'); }
  catch {
    actions.push('create wiki/research/');
    if (!dryRun) await fs.mkdir(researchDir, { recursive: true });
  }
  const gitkeep = path.join(researchDir, '.gitkeep');
  try { await fs.access(gitkeep); }
  catch {
    actions.push('create wiki/research/.gitkeep');
    if (!dryRun) await fs.writeFile(gitkeep, '', 'utf-8');
  }

  const dashboardPath = path.join(vaultPath, 'research-dashboard.md');
  try { await fs.access(dashboardPath); actions.push('research-dashboard.md already exists'); }
  catch {
    actions.push('create research-dashboard.md');
    if (!dryRun) await fs.writeFile(dashboardPath, DASHBOARD_CONTENT, 'utf-8');
  }

  return { actions, dryRun };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // $MEMORY_VAULT se existir; senão ~/research-vault (criado na primeira execução)
  const vault = process.env.MEMORY_VAULT || path.join(os.homedir(), 'research-vault');
  const dryRun = process.argv.includes('--dry-run');
  console.log(`vault: ${vault}`);
  bootstrap(vault, { dryRun, create: true })
    .then(r => { console.log(`bootstrap${dryRun ? ' (dry-run)' : ''}:\n` + r.actions.map(a => '  - ' + a).join('\n')); })
    .catch(err => { console.error('bootstrap failed:', err.message); process.exit(1); });
}

export default { bootstrap };
