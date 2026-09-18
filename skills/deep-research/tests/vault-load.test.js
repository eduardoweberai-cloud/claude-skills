import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vaultLoad, extractKeywords } from '../scripts/vault-load.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/sample-vault');

test('extractKeywords: filters stopwords, lowercases, dedups', () => {
  const kws = extractKeywords('como automatizar a emissao de NFS-e via Playwright');
  assert.ok(kws.includes('automatizar'));
  assert.ok(kws.includes('emissao'));
  assert.ok(kws.includes('nfse') || kws.includes('nfs-e'));
  assert.ok(kws.includes('playwright'));
  assert.ok(!kws.includes('a'));
  assert.ok(!kws.includes('de'));
});

test('vaultLoad: finds nfse-playbook with high score for nfse query', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse', 'automatizar']);
  const paths = result.relevant_pages.map(p => p.path);
  assert.ok(paths.some(p => p.includes('nfse-playbook')), 'nfse-playbook should be found');
});

test('vaultLoad: excludes wiki/_state/identity.md', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse']);
  const paths = result.relevant_pages.map(p => p.path);
  assert.ok(!paths.some(p => p.includes('identity.md')), 'identity.md must be excluded');
});

test('vaultLoad: excludes wiki/notes/ by default', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse']);
  const paths = result.relevant_pages.map(p => p.path);
  assert.ok(!paths.some(p => p.includes('/notes/')), 'notes/ must be excluded by default');
});

test('vaultLoad: respects custom scopes (only projects)', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse'], { scopes: ['wiki/projects/'] });
  const paths = result.relevant_pages.map(p => p.path);
  assert.ok(paths.every(p => p.includes('/projects/')), 'should only have projects/');
  assert.ok(paths.some(p => p.includes('painel')));
});

test('vaultLoad: filters out unrelated pages (no keyword match)', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse']);
  const paths = result.relevant_pages.map(p => p.path);
  assert.ok(!paths.some(p => p.includes('unrelated-tea')), 'unrelated should be filtered');
});

test('vaultLoad: respects maxPages cap', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse', 'playwright', 'painel'], { maxPages: 2 });
  assert.ok(result.relevant_pages.length <= 2);
});

test('vaultLoad: ranks higher density first', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse']);
  if (result.relevant_pages.length >= 2) {
    const first = result.relevant_pages[0];
    const last = result.relevant_pages[result.relevant_pages.length - 1];
    assert.ok(first.score >= last.score);
  }
});

test('vaultLoad: returns empty pages when nothing matches', async () => {
  const result = await vaultLoad(FIXTURE, ['nonexistent-xyz123']);
  assert.equal(result.relevant_pages.length, 0);
});

test('vaultLoad: returns frontmatter for each page', async () => {
  const result = await vaultLoad(FIXTURE, ['nfse']);
  for (const page of result.relevant_pages) {
    assert.ok(page.frontmatter, 'every page must have frontmatter');
    assert.ok(page.title, 'every page must have a title');
  }
});
