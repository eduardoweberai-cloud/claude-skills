import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from '../scripts/render-template.js';

test('renderTemplate: substitutes simple {{key}} placeholders', () => {
  const tpl = '# {{title}}\n\nMode: {{research_mode}}';
  const r = renderTemplate(tpl, { title: 'NFS-e', research_mode: 'automation' });
  assert.equal(r.rendered, '# NFS-e\n\nMode: automation');
  assert.deepEqual(r.missing, []);
});

test('renderTemplate: numbers and booleans stringify', () => {
  const tpl = 'score: {{coverage_score}}\nflag: {{has_shortlist}}';
  const r = renderTemplate(tpl, { coverage_score: 78, has_shortlist: true });
  assert.match(r.rendered, /score: 78/);
  assert.match(r.rendered, /flag: true/);
});

test('renderTemplate: {{key_yaml}} serializes arrays as YAML inline', () => {
  const tpl = 'linked: {{projects_yaml}}';
  const r = renderTemplate(tpl, { projects_yaml: ['[[painel]]', '[[meu-crm]]'] });
  assert.match(r.rendered, /linked: \[/);
  assert.match(r.rendered, /\[\[painel\]\]/);
  assert.match(r.rendered, /\[\[meu-crm\]\]/);
});

test('renderTemplate: empty array → []', () => {
  const tpl = 'list: {{empty_yaml}}';
  const r = renderTemplate(tpl, { empty_yaml: [] });
  assert.equal(r.rendered, 'list: []');
});

test('renderTemplate: null becomes "null" in YAML mode', () => {
  const tpl = 'val: {{x_yaml}}';
  const r = renderTemplate(tpl, { x_yaml: null });
  assert.equal(r.rendered, 'val: null');
});

test('renderTemplate: missing keys substitute empty + appear in missing list', () => {
  const tpl = 'A: {{found}}, B: {{missing}}, C: {{also_missing}}';
  const r = renderTemplate(tpl, { found: 'x' });
  assert.equal(r.rendered, 'A: x, B: , C: ');
  assert.deepEqual(r.missing.sort(), ['also_missing', 'missing']);
});

test('renderTemplate: {{body}} is treated as raw string (no escaping)', () => {
  const tpl = 'BODY:\n{{body}}';
  const r = renderTemplate(tpl, { body: '## Section\n\n```js\nconst x = 1;\n```' });
  assert.match(r.rendered, /## Section/);
  assert.match(r.rendered, /```js/);
});

test('renderTemplate: same key used twice substitutes both', () => {
  const tpl = '{{slug}} / {{slug}}';
  const r = renderTemplate(tpl, { slug: '2026-05-13-x' });
  assert.equal(r.rendered, '2026-05-13-x / 2026-05-13-x');
});

test('renderTemplate: text without placeholders passes through unchanged', () => {
  const tpl = 'Plain markdown\nwith no { placeholders }.';
  const r = renderTemplate(tpl, {});
  assert.equal(r.rendered, tpl);
  assert.deepEqual(r.missing, []);
});
