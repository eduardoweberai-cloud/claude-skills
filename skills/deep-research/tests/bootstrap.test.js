import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { bootstrap } from '../scripts/bootstrap.js';

let tmpVault;

beforeEach(async () => {
  tmpVault = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-bootstrap-'));
});

afterEach(async () => {
  await fs.rm(tmpVault, { recursive: true, force: true });
});

test('bootstrap: adds research type to CLAUDE.md types list', async () => {
  const claude = `# Memory Vault\n\n  types:\n    - pattern\n    - learning\n    - decision\n`;
  await fs.writeFile(path.join(tmpVault, 'CLAUDE.md'), claude);
  await bootstrap(tmpVault);
  const after = await fs.readFile(path.join(tmpVault, 'CLAUDE.md'), 'utf-8');
  assert.match(after, /^\s*-\s*research\s*$/m);
});

test('bootstrap: creates backup .research-bootstrap.bak', async () => {
  const claude = `# Memory Vault\n\n  types:\n    - pattern\n`;
  await fs.writeFile(path.join(tmpVault, 'CLAUDE.md'), claude);
  await bootstrap(tmpVault);
  const bak = await fs.readFile(path.join(tmpVault, 'CLAUDE.md.research-bootstrap.bak'), 'utf-8');
  assert.equal(bak, claude);
});

test('bootstrap: creates wiki/research/ directory with .gitkeep', async () => {
  await fs.writeFile(path.join(tmpVault, 'CLAUDE.md'), '# Memory Vault\n  types:\n    - pattern\n');
  await bootstrap(tmpVault);
  const stat = await fs.stat(path.join(tmpVault, 'wiki/research')).catch(() => null);
  assert.ok(stat?.isDirectory(), 'wiki/research/ must exist');
  const keep = await fs.readFile(path.join(tmpVault, 'wiki/research/.gitkeep'), 'utf-8').catch(() => null);
  assert.ok(keep !== null, '.gitkeep must exist');
});

test('bootstrap: creates research-dashboard.md', async () => {
  await fs.writeFile(path.join(tmpVault, 'CLAUDE.md'), '# Memory Vault\n  types:\n    - pattern\n');
  await bootstrap(tmpVault);
  const dash = await fs.readFile(path.join(tmpVault, 'research-dashboard.md'), 'utf-8');
  assert.match(dash, /Research Dashboard/);
  assert.match(dash, /```dataview/);
});

test('bootstrap: idempotent — running twice does not duplicate', async () => {
  await fs.writeFile(path.join(tmpVault, 'CLAUDE.md'), '# Memory Vault\n  types:\n    - pattern\n');
  await bootstrap(tmpVault);
  await bootstrap(tmpVault);
  const after = await fs.readFile(path.join(tmpVault, 'CLAUDE.md'), 'utf-8');
  const occurrences = (after.match(/^\s*-\s*research\s*$/gm) || []).length;
  assert.equal(occurrences, 1, `Expected 1 occurrence, got ${occurrences}`);
});

test('bootstrap: no-op when research already in CLAUDE.md', async () => {
  const claude = `# Memory Vault\n\n  types:\n    - pattern\n    - research\n    - learning\n`;
  await fs.writeFile(path.join(tmpVault, 'CLAUDE.md'), claude);
  await bootstrap(tmpVault);
  const after = await fs.readFile(path.join(tmpVault, 'CLAUDE.md'), 'utf-8');
  assert.equal(after, claude);
  const bakExists = await fs.stat(path.join(tmpVault, 'CLAUDE.md.research-bootstrap.bak')).then(() => true).catch(() => false);
  assert.equal(bakExists, false, 'no backup when no change');
});

test('bootstrap: fails clearly when CLAUDE.md missing', async () => {
  await assert.rejects(bootstrap(tmpVault), /CLAUDE\.md/);
});

test('bootstrap: create option builds a fresh vault from nothing', async () => {
  const fresh = path.join(tmpVault, 'novo-vault');
  await bootstrap(fresh, { create: true });
  const claude = await fs.readFile(path.join(fresh, 'CLAUDE.md'), 'utf-8');
  assert.match(claude, /^\s*-\s*research\s*$/m);
  const hasDir = await fs.stat(path.join(fresh, 'wiki', 'research', '.gitkeep')).then(() => true).catch(() => false);
  assert.equal(hasDir, true);
  const hasDash = await fs.stat(path.join(fresh, 'research-dashboard.md')).then(() => true).catch(() => false);
  assert.equal(hasDash, true);
});

test('bootstrap: dry-run mode reports actions without changing files', async () => {
  const claude = `# Memory Vault\n\n  types:\n    - pattern\n`;
  await fs.writeFile(path.join(tmpVault, 'CLAUDE.md'), claude);
  const report = await bootstrap(tmpVault, { dryRun: true });
  assert.ok(Array.isArray(report.actions), 'dry-run returns actions array');
  assert.ok(report.actions.some(a => a.includes('research')));
  const after = await fs.readFile(path.join(tmpVault, 'CLAUDE.md'), 'utf-8');
  assert.equal(after, claude, 'dry-run must not modify CLAUDE.md');
});
