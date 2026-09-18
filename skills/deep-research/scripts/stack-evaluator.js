import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

let execImpl = promisify(execCb);

export function _setExecForTests(fn) { execImpl = fn; }

export function parseRepoUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?\/?(?:[?#].*)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export async function evaluateRepo(url, options = {}) {
  const parsed = parseRepoUrl(url);
  if (!parsed) {
    return { url, stars: null, forks: null, last_commit: null, license: null, archived: null, fork: null, error: 'not-a-github-url' };
  }
  const { owner, repo } = parsed;
  const ghPath = options.ghPath || 'gh';
  const cmd = `${ghPath} api repos/${owner}/${repo}`;
  try {
    const { stdout } = await execImpl(cmd, { maxBuffer: 1024 * 1024 });
    const data = JSON.parse(stdout);
    return {
      url,
      owner, repo,
      stars: data.stargazers_count ?? null,
      forks: data.forks_count ?? null,
      last_commit: (data.pushed_at || '').slice(0, 10) || null,
      license: data.license?.spdx_id ?? null,
      archived: !!data.archived,
      fork: !!data.fork,
      full_name: data.full_name ?? null,
      error: null,
    };
  } catch (err) {
    return {
      url,
      owner, repo,
      stars: null, forks: null, last_commit: null, license: null, archived: null, fork: null,
      error: (err && err.message) ? String(err.message).split('\n')[0] : 'unknown',
    };
  }
}

export default { parseRepoUrl, evaluateRepo, _setExecForTests };
