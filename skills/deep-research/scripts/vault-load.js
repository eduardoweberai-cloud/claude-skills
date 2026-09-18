import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SCOPES = ['wiki/concepts/', 'wiki/projects/', 'wiki/clients/', 'wiki/_refs/'];
const DEFAULT_EXCLUDE = ['wiki/_state/', 'wiki/notes/', 'raw/'];

const STOPWORDS = new Set([
  'a','o','as','os','um','uma','de','do','da','dos','das','em','no','na','nos','nas',
  'para','por','pelo','pela','com','sem','sobre','que','se','e','ou','mas','eh','foi',
  'ser','ter','como','quando','onde','isso','esse','essa','este','esta',
  'the','an','of','in','on','at','to','for','with','by','from','as',
  'and','or','but','is','are','was','were','be','been','being','has','have','had',
  'how','what','when','where','why','who','which','this','that','these','those',
  'via', 'pra',
]);

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function extractKeywords(query) {
  if (!query) return [];
  const norm = stripAccents(query.toLowerCase())
    .replace(/[^a-z0-9\- ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set();
  for (const tok of norm) {
    const clean = tok.replace(/^-+|-+$/g, '');
    if (!clean) continue;
    if (STOPWORDS.has(clean)) continue;
    if (clean.length < 2 && !/^\d+$/.test(clean)) continue;
    out.add(clean);
    if (clean.includes('-')) out.add(clean.replace(/-/g, ''));
  }
  return [...out];
}

async function listMarkdownFiles(dir, baseRel = '') {
  const out = [];
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = baseRel ? path.posix.join(baseRel, e.name) : e.name;
    if (e.isDirectory()) {
      const sub = await listMarkdownFiles(full, rel);
      out.push(...sub);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push({ abs: full, rel });
    }
  }
  return out;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: {}, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: {}, body: content };
  const fmRaw = content.slice(3, end).trim();
  const body = content.slice(end + 4).replace(/^\n/, '');
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, '');
    }
    fm[m[1]] = val;
  }
  return { frontmatter: fm, body };
}

function scoreContent(content, keywords) {
  const lower = stripAccents(content.toLowerCase());
  let hits = 0;
  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    const matches = lower.match(re);
    if (matches) hits += matches.length;
  }
  const words = lower.split(/\s+/).length || 1;
  return hits / Math.sqrt(words);
}

function inAnyScope(rel, scopes) {
  return scopes.some(s => rel.startsWith(s.replace(/\\/g, '/')));
}

function inAnyExclude(rel, exclude) {
  return exclude.some(e => rel.startsWith(e.replace(/\\/g, '/')));
}

function makeSnippet(body, keywords, maxLen = 240) {
  const lower = stripAccents(body.toLowerCase());
  let bestIdx = -1;
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
  }
  if (bestIdx === -1) return body.slice(0, maxLen).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, bestIdx - 60);
  return body.slice(start, start + maxLen).replace(/\s+/g, ' ').trim();
}

export async function vaultLoad(vaultPath, keywords, options = {}) {
  const scopes = options.scopes || DEFAULT_SCOPES;
  const exclude = options.exclude || DEFAULT_EXCLUDE;
  const maxPages = options.maxPages ?? 5;

  let indexSummary = '';
  try { indexSummary = (await fs.readFile(path.join(vaultPath, 'index.md'), 'utf-8')).slice(0, 800); }
  catch { /* ok */ }

  const allFiles = await listMarkdownFiles(vaultPath);
  const inScope = allFiles.filter(f => {
    const rel = f.rel.split(path.sep).join('/');
    return inAnyScope(rel, scopes) && !inAnyExclude(rel, exclude);
  });

  const scored = [];
  for (const f of inScope) {
    const content = await fs.readFile(f.abs, 'utf-8').catch(() => '');
    if (!content) continue;
    const { frontmatter, body } = parseFrontmatter(content);
    const tagText = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(' ') : '';
    const score = scoreContent(body + ' ' + (frontmatter.title || '') + ' ' + tagText, keywords);
    if (score === 0) continue;
    const relNorm = f.rel.split(path.sep).join('/');
    scored.push({
      path: relNorm,
      title: frontmatter.title || path.basename(f.rel, '.md'),
      type: frontmatter.type || 'unknown',
      score,
      snippet: makeSnippet(body, keywords),
      frontmatter,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxPages);

  const knownProjects = top.filter(p => p.path.startsWith('wiki/projects/')).map(p => `[[${path.basename(p.path, '.md')}]]`);
  const knownConcepts = top.filter(p => p.path.startsWith('wiki/concepts/')).map(p => `[[${path.basename(p.path, '.md')}]]`);
  const knownClients = top.filter(p => p.path.startsWith('wiki/clients/')).map(p => `[[${path.basename(p.path, '.md')}]]`);

  return {
    index_summary: indexSummary,
    relevant_pages: top,
    known_projects: knownProjects,
    known_concepts: knownConcepts,
    known_clients: knownClients,
  };
}

export default { vaultLoad, extractKeywords };
