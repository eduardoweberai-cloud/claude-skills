import fs from "node:fs";
import type { PreparedBundle, PostAnalysis, PreparedPost } from "./types.ts";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtNum(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

function frameDataUri(framePath: string | undefined): string | null {
  if (!framePath) return null;
  try {
    const buf = fs.readFileSync(framePath);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Ordena posts do maior engagement outlier para o menor (null por último). */
export function sortByOutlier(posts: PreparedPost[]): PreparedPost[] {
  return [...posts].sort((a, b) => {
    const av = a.engagementOutlier ?? -Infinity;
    const bv = b.engagementOutlier ?? -Infinity;
    return bv - av;
  });
}

function framesStrip(post: PreparedPost): string {
  const imgs = post.framePaths
    .map((p, i) => {
      const uri = frameDataUri(p);
      if (!uri) return "";
      const label = post.framePaths.length > 1
        ? (i === 0 ? "hook" : i === post.framePaths.length - 1 ? "fim" : String(i + 1))
        : "";
      return `<figure class="frame"><img src="${uri}" alt="frame ${i + 1}"><figcaption>${label}</figcaption></figure>`;
    })
    .join("");
  if (!imgs) return `<div class="frames empty">sem frames disponíveis</div>`;
  return `<div class="frames">${imgs}</div>`;
}

function card(post: PreparedPost, position: number, a: PostAnalysis | undefined): string {
  const outlier = post.engagementOutlier != null ? `${post.engagementOutlier.toFixed(1)}x` : "—";
  const vout = post.viewOutlier != null ? `${post.viewOutlier.toFixed(1)}x` : null;
  const erate = post.engagementRate != null ? `${(post.engagementRate * 100).toFixed(1)}%` : null;
  const caption = post.caption
    ? `<div class="block"><div class="label">Legenda original</div><pre class="copytext">${escapeHtml(post.caption)}</pre></div>`
    : "";
  const transcript = a?.transcript
    ? `<div class="block"><div class="label">Transcript (copiável)</div><pre class="copytext">${escapeHtml(a.transcript)}</pre></div>`
    : "";
  const degraded = post.degraded ? `<span class="warn">vídeo não baixou: só thumbnail/legenda</span>` : "";
  return `
  <article class="card">
    <div class="cardhead">
      <span class="rank">#${position}</span>
      <span class="outlier" title="engagement outlier: quanto estourou vs a mediana do próprio perfil">🔥 ${outlier}</span>
      <span class="meta">@${escapeHtml(post.ownerUsername)} · ${post.type} · ${escapeHtml(post.timestamp.slice(0, 10))} ${degraded}</span>
    </div>
    ${framesStrip(post)}
    <div class="body">
      <div class="stats">
        <span title="engagement outlier">🔥 outlier ${outlier}</span>
        ${vout ? `<span title="view outlier">👁 views ${vout}</span>` : ""}
        <span>❤ ${fmtNum(post.likes)}</span>
        <span>💬 ${fmtNum(post.comments)}</span>
        ${post.views != null ? `<span>▶ ${fmtNum(post.views)}</span>` : ""}
        ${erate ? `<span title="engagement rate">📊 ${erate}</span>` : ""}
      </div>
      <div class="hook"><span class="label">Hook</span> ${escapeHtml(a?.hook ?? "—")}</div>
      <div class="line"><strong>Formato:</strong> ${escapeHtml(a?.visualFormat ?? "—")}</div>
      <div class="line"><strong>Tópico:</strong> ${escapeHtml(a?.topic ?? "—")}</div>
      <div class="line"><strong>Por que funcionou:</strong> ${escapeHtml(a?.whyItWorked ?? "—")}</div>
      ${caption}
      ${transcript}
      <a class="link" href="${escapeHtml(post.permalink)}" target="_blank" rel="noopener">abrir no Instagram (opcional)</a>
    </div>
  </article>`;
}

export function buildReportHtml(bundle: PreparedBundle, analyses: PostAnalysis[]): string {
  const byCode = new Map(analyses.map((a) => [a.shortcode, a]));
  const ordered = sortByOutlier(bundle.posts);
  const cards = ordered.map((p, i) => card(p, i + 1, byCode.get(p.shortcode))).join("\n");
  const { config } = bundle;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pesquisa de concorrentes: ${escapeHtml(config.slug)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#0f1115;color:#e8eaed;line-height:1.5}
  header{padding:24px 32px;border-bottom:1px solid #262a33;position:sticky;top:0;background:#0f1115;z-index:5}
  h1{margin:0 0 4px;font-size:20px}
  .sub{color:#9aa0a6;font-size:13px}
  main{padding:24px 16px;max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
  .card{background:#171a21;border:1px solid #262a33;border-radius:14px;overflow:hidden}
  .cardhead{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #21262f;flex-wrap:wrap}
  .rank{background:#2b6cff;color:#fff;font-weight:700;font-size:13px;padding:2px 10px;border-radius:20px}
  .outlier{font-weight:700;font-size:15px;color:#ff7a45}
  .meta{color:#9aa0a6;font-size:12px;margin-left:auto}
  .warn{color:#ffb020;margin-left:8px}
  .frames{display:flex;gap:8px;overflow-x:auto;padding:14px 16px;background:#0b0d11;scrollbar-width:thin}
  .frames.empty{color:#6b7280;font-size:13px}
  .frame{margin:0;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:4px}
  .frame img{height:420px;width:auto;aspect-ratio:9/16;object-fit:contain;background:#000;border-radius:8px;display:block}
  .frame figcaption{font-size:11px;color:#8a919c}
  .body{padding:16px}
  .stats{display:flex;gap:14px;flex-wrap:wrap;font-size:14px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #21262f}
  .hook{font-size:16px;margin-bottom:12px;line-height:1.5;color:#fff}
  .line{font-size:14px;margin-bottom:8px;color:#d3d7dd}
  .label{display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#7a828c;font-weight:700}
  .block{margin-top:12px}
  .block .label{margin-bottom:6px}
  .copytext{white-space:pre-wrap;background:#0b0d11;border:1px solid #262a33;border-radius:8px;padding:12px;font-size:13px;margin:0;max-height:260px;overflow:auto;user-select:all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .link{display:inline-block;margin-top:14px;color:#5b8cff;font-size:13px;text-decoration:none;border:1px solid #2b3550;padding:6px 12px;border-radius:8px}
  .link:hover{background:#1a2030}
</style></head>
<body>
<header>
  <h1>Pesquisa de concorrentes: ${escapeHtml(config.slug)}</h1>
  <div class="sub">${config.handles.map((h) => "@" + escapeHtml(h)).join(", ")} · período ${escapeHtml(config.from)} a ${escapeHtml(config.to)} · ${ordered.length} posts, ordenados por outlier de engajamento</div>
</header>
<main>
${cards}
</main>
</body></html>`;
}

export function buildReportJson(bundle: PreparedBundle, analyses: PostAnalysis[]): object {
  const byCode = new Map(analyses.map((a) => [a.shortcode, a]));
  return {
    config: bundle.config,
    generatedAt: bundle.generatedAt,
    posts: sortByOutlier(bundle.posts).map((p) => ({
      shortcode: p.shortcode,
      permalink: p.permalink,
      timestamp: p.timestamp,
      type: p.type,
      ownerUsername: p.ownerUsername,
      caption: p.caption,
      likes: p.likes,
      comments: p.comments,
      views: p.views,
      engagement: p.engagement,
      engagementOutlier: p.engagementOutlier,
      viewOutlier: p.viewOutlier,
      engagementRate: p.engagementRate,
      rank: p.rank,
      degraded: p.degraded,
      analysis: byCode.get(p.shortcode) ?? null,
    })),
  };
}
