import fs from 'node:fs/promises';
import path from 'node:path';
import { extractKeywords } from './vault-load.js';

const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_CAP = 5;
const PROJECT_DIR = 'wiki/projects';
const CONCEPT_DIR = 'wiki/concepts';

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function listMd(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return []; }
  const out = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.md')) {
      out.push({ slug: path.basename(e.name, '.md'), abs: path.join(dir, e.name) });
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

function scoreAgainstContent(haystackTokens, needleTokens) {
  if (needleTokens.length === 0) return 0;
  const haySet = new Set(haystackTokens);
  let hits = 0;
  for (const tok of needleTokens) if (haySet.has(tok)) hits++;
  return hits / Math.sqrt(needleTokens.length);
}

function tokenize(s) {
  return stripAccents(s.toLowerCase()).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
}

async function rankDir(dir, contentTokens, threshold) {
  const ranked = [];
  for (const { slug, abs } of await listMd(dir)) {
    const content = await fs.readFile(abs, 'utf-8').catch(() => '');
    if (!content) continue;
    const { frontmatter, body } = parseFrontmatter(content);
    const tagText = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(' ') : '';
    const pageTokens = tokenize([slug, frontmatter.title || '', tagText, body.slice(0, 400)].join(' '));
    const score = scoreAgainstContent(contentTokens, pageTokens);
    if (score >= threshold) ranked.push({ slug, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export async function findLinkedPages(vaultPath, researchContent, options = {}) {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const cap = options.cap ?? DEFAULT_CAP;
  const contentKeywords = extractKeywords(researchContent);
  const tokens = tokenize(researchContent).slice(0, 2000);
  const merged = [...new Set([...contentKeywords, ...tokens])];
  const projectRanked = await rankDir(path.join(vaultPath, PROJECT_DIR), merged, threshold);
  const conceptRanked = await rankDir(path.join(vaultPath, CONCEPT_DIR), merged, threshold);
  return {
    projects: projectRanked.slice(0, cap).map(r => `[[${r.slug}]]`),
    concepts: conceptRanked.slice(0, cap).map(r => `[[${r.slug}]]`),
  };
}

export function addInlineBacklinks(body, links) {
  let out = body;
  for (const link of links) {
    const slug = link.replace(/^\[\[|\]\]$/g, '');
    if (out.includes(`[[${slug}]]`)) continue;
    const re = new RegExp(`\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    out = out.replace(re, link);
  }
  return out;
}

export default { findLinkedPages, addInlineBacklinks };
