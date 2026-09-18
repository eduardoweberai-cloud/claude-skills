export function normalizeHandle(raw: string): string {
  let h = raw.trim();
  const urlMatch = h.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) h = urlMatch[1];
  h = h.replace(/^@/, "").trim().toLowerCase();
  return h;
}

export function parseCompetitorsFile(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map(normalizeHandle)
    .filter((h) => h.length > 0);
}

export function resolveHandles(opts: {
  slug?: string;
  inline?: string[];
  fileContent?: string;
}): string[] {
  const fromFile = opts.fileContent ? parseCompetitorsFile(opts.fileContent) : [];
  const fromInline = (opts.inline ?? []).map(normalizeHandle).filter((h) => h.length > 0);
  const merged: string[] = [];
  for (const h of [...fromFile, ...fromInline]) {
    if (!merged.includes(h)) merged.push(h);
  }
  if (merged.length === 0) {
    throw new Error("resolveHandles: nenhum handle resolvido (passe slug com arquivo ou handles avulsos).");
  }
  return merged;
}
