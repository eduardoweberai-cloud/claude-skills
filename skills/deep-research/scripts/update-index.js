import fs from 'node:fs/promises';
import path from 'node:path';

const LOCK_FILENAME = '.index.lock';
const STALE_LOCK_MS = 60_000;
const POLL_INTERVAL_MS = 100;

async function acquireLock(vaultPath, timeoutMs) {
  const lockPath = path.join(vaultPath, LOCK_FILENAME);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const handle = await fs.open(lockPath, 'wx');
      await handle.write(`${process.pid}:${Date.now()}`);
      await handle.close();
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const contents = await fs.readFile(lockPath, 'utf-8');
        const [, ts] = contents.split(':');
        const ageMs = Date.now() - Number(ts || 0);
        if (Number.isFinite(ageMs) && ageMs > STALE_LOCK_MS) {
          await fs.unlink(lockPath).catch(() => {});
          continue;
        }
      } catch { /* race: lock vanished, retry */ }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  throw new Error(`Could not acquire lock at ${lockPath} within ${timeoutMs}ms — another process is editing the index.`);
}

async function releaseLock(vaultPath) {
  await fs.unlink(path.join(vaultPath, LOCK_FILENAME)).catch(() => {});
}

async function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, content, 'utf-8');
  try {
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
}

function formatRow({ slug, mode, topic, linkedSummary, dateStr }) {
  const safeTopic = topic.replace(/\|/g, '\\|');
  const safeLinked = (linkedSummary || '').replace(/\|/g, '\\|');
  return `| [[${slug}]] | ${mode} | ${safeTopic} | ${safeLinked} | ${dateStr} |`;
}

const RESEARCH_HEADER = '## Research';
const TABLE_HEADER = '| Slug | Mode | Topic | Linked | Date |';
const TABLE_SEP = '|---|---|---|---|---|';

function insertOrUpdateResearchRow(indexContent, row, slug) {
  const lines = indexContent.split('\n');
  const headerIdx = lines.findIndex(l => l.trim() === RESEARCH_HEADER);
  if (headerIdx === -1) {
    const block = ['', RESEARCH_HEADER, '', TABLE_HEADER, TABLE_SEP, row, ''];
    return (indexContent.replace(/\s+$/, '') + '\n' + block.join('\n') + '\n');
  }
  let tableStart = -1;
  let i = headerIdx + 1;
  for (; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (ln.startsWith('## ')) break;
    if (ln === TABLE_HEADER.trim()) {
      tableStart = i;
      break;
    }
  }
  if (tableStart === -1) {
    const block = ['', TABLE_HEADER, TABLE_SEP, row];
    lines.splice(headerIdx + 1, 0, ...block);
    return lines.join('\n');
  }
  const slugMarker = `[[${slug}]]`;
  let existingIdx = -1;
  for (let j = tableStart + 2; j < lines.length; j++) {
    if (lines[j].trim().startsWith('## ')) break;
    if (lines[j].includes(slugMarker)) {
      existingIdx = j;
      break;
    }
    if (!lines[j].trim().startsWith('|')) break;
  }
  if (existingIdx !== -1) {
    lines[existingIdx] = row;
  } else {
    let insertAt = tableStart + 2;
    while (insertAt < lines.length && lines[insertAt].trim().startsWith('|')) {
      insertAt++;
    }
    lines.splice(insertAt, 0, row);
  }
  return lines.join('\n');
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function nowTimestamp() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export async function updateIndex(vaultPath, opts) {
  const {
    slug, mode, topic, linkedSummary = '',
    lockTimeoutMs = 5000,
    dateStr = todayISODate(),
  } = opts;
  if (!slug || !mode || !topic) {
    throw new Error('updateIndex requires { slug, mode, topic }');
  }
  await acquireLock(vaultPath, lockTimeoutMs);
  try {
    const indexPath = path.join(vaultPath, 'index.md');
    const logPath = path.join(vaultPath, 'log.md');
    let indexContent = '';
    try { indexContent = await fs.readFile(indexPath, 'utf-8'); }
    catch (err) { if (err.code !== 'ENOENT') throw err; indexContent = '# Memory Vault\n'; }
    const row = formatRow({ slug, mode, topic, linkedSummary, dateStr });
    const updated = insertOrUpdateResearchRow(indexContent, row, slug);
    await atomicWrite(indexPath, updated);

    const logLine = `\n## [${nowTimestamp()}] research | ${mode} | ${topic} | linked: ${linkedSummary || '—'}\n`;
    try {
      const existing = await fs.readFile(logPath, 'utf-8');
      await fs.writeFile(logPath, existing.replace(/\s+$/, '') + logLine, 'utf-8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      await fs.writeFile(logPath, `# Log${logLine}`, 'utf-8');
    }
  } finally {
    await releaseLock(vaultPath);
  }
}

export default { updateIndex };
