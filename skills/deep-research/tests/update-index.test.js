import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { updateIndex } from '../scripts/update-index.js';

let tmpVault;

beforeEach(async () => {
  tmpVault = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-test-vault-'));
});

afterEach(async () => {
  await fs.rm(tmpVault, { recursive: true, force: true });
});

async function seedIndex(vault, content) {
  await fs.writeFile(path.join(vault, 'index.md'), content);
}
async function readIndex(vault) {
  return fs.readFile(path.join(vault, 'index.md'), 'utf-8');
}
async function readLog(vault) {
  return fs.readFile(path.join(vault, 'log.md'), 'utf-8').catch(() => '');
}

test('updateIndex: creates ## Research section when missing', async () => {
  await seedIndex(tmpVault, '# Memory Vault\n\n## Projects\n\n- foo\n');
  await updateIndex(tmpVault, {
    slug: '2026-05-12-nfse-automacao',
    mode: 'automation',
    topic: 'Automatizar NFS-e',
    linkedSummary: '[[painel]]',
  });
  const idx = await readIndex(tmpVault);
  assert.match(idx, /## Research/);
  assert.match(idx, /2026-05-12-nfse-automacao/);
  assert.match(idx, /automation/);
  assert.match(idx, /\[\[painel\]\]/);
});

test('updateIndex: inserts in existing ## Research section', async () => {
  const existing = `# Memory Vault\n\n## Research\n\n| Slug | Mode | Topic | Linked | Date |\n|---|---|---|---|---|\n| [[2026-04-01-old]] | deep | Old topic |  | 2026-04-01 |\n\n## Projects\n\n- foo\n`;
  await seedIndex(tmpVault, existing);
  await updateIndex(tmpVault, {
    slug: '2026-05-12-new',
    mode: 'stack',
    topic: 'New topic',
    linkedSummary: '[[meu-crm]]',
  });
  const idx = await readIndex(tmpVault);
  assert.match(idx, /2026-04-01-old/);
  assert.match(idx, /2026-05-12-new/);
});

test('updateIndex: idempotent — same slug updates not duplicates', async () => {
  await seedIndex(tmpVault, '# Memory Vault\n');
  await updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X', linkedSummary: '' });
  await updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X updated', linkedSummary: '[[a]]' });
  const idx = await readIndex(tmpVault);
  const matches = idx.match(/2026-05-12-x/g) || [];
  assert.equal(matches.length, 1, `Expected 1 occurrence, got ${matches.length}`);
  assert.match(idx, /X updated/);
  assert.match(idx, /\[\[a\]\]/);
});

test('updateIndex: appends to log.md', async () => {
  await seedIndex(tmpVault, '# Memory Vault\n');
  await fs.writeFile(path.join(tmpVault, 'log.md'), '# Log\n\n## [2026-04-01 10:00] previous entry\n');
  await updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X', linkedSummary: '' });
  const log = await readLog(tmpVault);
  assert.match(log, /previous entry/);
  assert.match(log, /research \| deep \| X/);
});

test('updateIndex: creates log.md if missing', async () => {
  await seedIndex(tmpVault, '# Memory Vault\n');
  await updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X', linkedSummary: '' });
  const log = await readLog(tmpVault);
  assert.match(log, /research \| deep \| X/);
});

test('updateIndex: creates index.md if missing', async () => {
  await updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X', linkedSummary: '' });
  const idx = await readIndex(tmpVault);
  assert.match(idx, /## Research/);
  assert.match(idx, /2026-05-12-x/);
});

test('updateIndex: lock prevents concurrent writes', async () => {
  await seedIndex(tmpVault, '# Memory Vault\n');
  await fs.writeFile(path.join(tmpVault, '.index.lock'), `${process.pid + 999}:${Date.now()}`);
  await assert.rejects(
    updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X', linkedSummary: '', lockTimeoutMs: 500 }),
    /lock/i
  );
});

test('updateIndex: stale lock (older than 60s) is broken automatically', async () => {
  await seedIndex(tmpVault, '# Memory Vault\n');
  await fs.writeFile(path.join(tmpVault, '.index.lock'), `${process.pid + 999}:${Date.now() - 120000}`);
  await updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X', linkedSummary: '' });
  const idx = await readIndex(tmpVault);
  assert.match(idx, /2026-05-12-x/);
});

test('updateIndex: atomic — tmp file cleaned up after success', async () => {
  await seedIndex(tmpVault, '# Memory Vault\n');
  await updateIndex(tmpVault, { slug: '2026-05-12-x', mode: 'deep', topic: 'X', linkedSummary: '' });
  const files = await fs.readdir(tmpVault);
  assert.ok(!files.some(f => f.endsWith('.tmp')), `Tmp files lingered: ${files.filter(f => f.endsWith('.tmp'))}`);
});
