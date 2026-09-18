import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRepoUrl, evaluateRepo, _setExecForTests } from '../scripts/stack-evaluator.js';

test('parseRepoUrl: extracts owner/repo from https URL', () => {
  assert.deepEqual(parseRepoUrl('https://github.com/anthropics/claude-code'), { owner: 'anthropics', repo: 'claude-code' });
  assert.deepEqual(parseRepoUrl('https://github.com/foo/bar.git'), { owner: 'foo', repo: 'bar' });
  assert.deepEqual(parseRepoUrl('github.com/baz/qux/'), { owner: 'baz', repo: 'qux' });
});

test('parseRepoUrl: returns null for non-github URLs', () => {
  assert.equal(parseRepoUrl('https://gitlab.com/foo/bar'), null);
  assert.equal(parseRepoUrl('https://example.com/anthropics/claude-code'), null);
});

test('evaluateRepo: returns enrichment from gh api stdout', async () => {
  _setExecForTests(async (cmd) => {
    if (cmd.includes('repos/foo/bar')) {
      return { stdout: JSON.stringify({
        stargazers_count: 1234,
        forks_count: 56,
        pushed_at: '2026-05-01T12:00:00Z',
        license: { spdx_id: 'MIT' },
        archived: false,
        fork: false,
        full_name: 'foo/bar',
      }) };
    }
    throw new Error('unexpected cmd: ' + cmd);
  });
  const r = await evaluateRepo('https://github.com/foo/bar');
  assert.equal(r.stars, 1234);
  assert.equal(r.forks, 56);
  assert.equal(r.last_commit, '2026-05-01');
  assert.equal(r.license, 'MIT');
  assert.equal(r.archived, false);
  assert.equal(r.fork, false);
});

test('evaluateRepo: detects archived repos', async () => {
  _setExecForTests(async () => ({ stdout: JSON.stringify({
    stargazers_count: 0, forks_count: 0, pushed_at: '2024-01-01T00:00:00Z',
    license: null, archived: true, fork: false, full_name: 'x/y',
  })}));
  const r = await evaluateRepo('https://github.com/x/y');
  assert.equal(r.archived, true);
  assert.equal(r.license, null);
});

test('evaluateRepo: graceful fallback on gh api failure', async () => {
  _setExecForTests(async () => { throw new Error('rate limit'); });
  const r = await evaluateRepo('https://github.com/foo/bar');
  assert.equal(r.stars, null);
  assert.equal(r.error, 'rate limit');
});

test('evaluateRepo: returns null fields for non-github URL', async () => {
  const r = await evaluateRepo('https://gitlab.com/foo/bar');
  assert.equal(r.stars, null);
  assert.equal(r.error, 'not-a-github-url');
});
