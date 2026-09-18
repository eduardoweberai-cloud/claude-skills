import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findLinkedPages, addInlineBacklinks } from '../scripts/vault-link-projects.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/sample-vault');

test('findLinkedPages: returns ranked projects + concepts', async () => {
  const content = 'Automatizar NFS-e via Playwright no Painel. Modulos financeiros, fiscal, emissor nacional.';
  const result = await findLinkedPages(FIXTURE, content);
  assert.ok(Array.isArray(result.projects));
  assert.ok(Array.isArray(result.concepts));
});

test('findLinkedPages: threshold filters low-relevance pages', async () => {
  const content = 'completely unrelated content about astrophysics and quantum mechanics';
  const result = await findLinkedPages(FIXTURE, content);
  assert.equal(result.projects.length + result.concepts.length, 0);
});

test('findLinkedPages: cap respected (max 5 each)', async () => {
  const content = 'nfse playwright painel chai tea identity unrelated random words galore';
  const result = await findLinkedPages(FIXTURE, content, { cap: 2 });
  assert.ok(result.projects.length <= 2);
  assert.ok(result.concepts.length <= 2);
});

test('findLinkedPages: returns [[wiki-link]] formatted strings', async () => {
  const content = 'nfse playwright automation painel';
  const result = await findLinkedPages(FIXTURE, content);
  for (const link of [...result.projects, ...result.concepts]) {
    assert.match(link, /^\[\[[a-z0-9\-]+\]\]$/);
  }
});

test('addInlineBacklinks: replaces first mention with [[link]]', () => {
  const body = 'Vamos usar painel para finanças. painel tem multiplos modulos.';
  const links = ['[[painel]]'];
  const out = addInlineBacklinks(body, links);
  assert.match(out, /\[\[painel\]\] para finan/);
  const second = out.split('finanças.')[1];
  assert.doesNotMatch(second, /\[\[painel\]\]/);
});

test('addInlineBacklinks: preserves existing [[links]]', () => {
  const body = 'Já temos [[painel]] funcionando. Outra mencao de painel no fim.';
  const links = ['[[painel]]'];
  const out = addInlineBacklinks(body, links);
  assert.doesNotMatch(out, /\[\[\[\[painel\]\]\]\]/);
  assert.match(out, /\[\[painel\]\] funcionando/);
});

test('addInlineBacklinks: case-insensitive match but preserves original case', () => {
  const body = 'Talvez no Painel isso resolva.';
  const links = ['[[painel]]'];
  const out = addInlineBacklinks(body, links);
  assert.match(out, /\[\[painel\]\]/);
});
