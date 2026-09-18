---
title: Research Dashboard
type: dashboard
---

# Research Dashboard

> Hub de todas as pesquisas geradas via `/deep-research`. Gerado por Dataview — atualiza sozinho.

## TL;DR Stats

```dataviewjs
const all = dv.pages('"wiki/research"').where(p => p.type === "research" && p.status !== "archived");
const byMode = all.groupBy(p => p.research_mode);
const totalMoneyAngles = all.array().reduce((s, p) => s + (p.money_angles_count || 0), 0);
const totalActions = all.array().reduce((s, p) => s + (p.next_actions_count || 0), 0);
dv.paragraph(`**${all.length}** researches | **${totalMoneyAngles}** money angles geradas | **${totalActions}** next actions`);
dv.paragraph(`Por mode: ${byMode.map(g => `${g.key}: ${g.rows.length}`).array().join(' · ')}`);
```

## Pesquisas Recentes (top 10)

```dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", coverage_score AS "Score", sources_by_credibility.high AS "HIGH src", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND status != "archived"
SORT created DESC
LIMIT 10
```

## Por Mode

### Deep
```dataview
TABLE WITHOUT ID file.link AS "Topic", coverage_score AS "Score", length(linked_projects) AS "Projects", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND research_mode = "deep" AND status != "archived"
SORT created DESC
```

### Stack
```dataview
TABLE WITHOUT ID file.link AS "Topic", repos_count AS "Repos", has_stack_shortlist AS "Shortlist?", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND research_mode = "stack" AND status != "archived"
SORT created DESC
```

### Automation
```dataview
TABLE WITHOUT ID file.link AS "Topic", process_complexity AS "Complexity", tools_found AS "Tools", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND research_mode = "automation" AND status != "archived"
SORT created DESC
```

## Money Angle Forte (3+ angles)

```dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", money_angles_count AS "Angles", join(linked_projects, ", ") AS "Aplicável em"
FROM "wiki/research"
WHERE type = "research" AND money_angles_count >= 3 AND status != "archived"
SORT money_angles_count DESC
```

## Por Projeto Ativo

### [[painel]]
```dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", next_actions_count AS "Actions"
FROM "wiki/research"
WHERE type = "research" AND contains(linked_projects, "[[painel]]")
SORT created DESC
```

### [[meu-crm]]
```dataview
TABLE WITHOUT ID file.link AS "Pesquisa", research_mode AS "Mode", next_actions_count AS "Actions"
FROM "wiki/research"
WHERE type = "research" AND contains(linked_projects, "[[meu-crm]]")
SORT created DESC
```

> **Adicionar projeto novo:** copie um bloco acima, troque o `[[slug]]`.

## TODO Geral

```dataviewjs
const researches = dv.pages('"wiki/research"').where(p => p.type === "research" && p.status !== "archived");
const tasks = [];
for (const r of researches.array()) {
  for (const t of r.file.tasks.array()) {
    if (!t.completed) tasks.push({ text: t.text, page: r.file.link, mode: r.research_mode });
  }
}
if (tasks.length === 0) dv.paragraph("✅ Nenhuma next action pendente.");
else dv.table(["Action", "Pesquisa", "Mode"], tasks.map(t => [t.text, t.page, t.mode]));
```

## Superseded

```dataview
TABLE WITHOUT ID file.link AS "Antiga", superseded_by AS "Substituída por", dateformat(created, "yyyy-MM-dd") AS "Data"
FROM "wiki/research"
WHERE type = "research" AND superseded_by != null
SORT created DESC
```

---
*Auto-rendered via Dataview. Skill `/deep-research` cria entries em `wiki/research/`.*
