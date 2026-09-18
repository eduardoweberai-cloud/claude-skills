import type { PreparedPost, PostAnalysis } from "./types.ts";

export function buildAnalysisPrompt(post: PreparedPost, transcript: string | null): string {
  const frames = post.framePaths.map((f) => `- ${f}`).join("\n") || "(sem frames)";
  const metrics = [
    `tipo: ${post.type}`,
    `likes: ${post.likes ?? "—"}`,
    `comentários: ${post.comments ?? "—"}`,
    `views: ${post.views ?? "—"}`,
    `engagement outlier: ${post.engagementOutlier?.toFixed(1) ?? "—"}x`,
    `view outlier: ${post.viewOutlier?.toFixed(1) ?? "—"}x`,
  ].join(" · ");
  return [
    `Você analisa UM post de Instagram do concorrente @${post.ownerUsername} para pesquisa de conteúdo.`,
    ``,
    `Métricas: ${metrics}`,
    `Legenda: ${post.caption ?? "(sem legenda)"}`,
    ``,
    `Frames (leia visualmente cada imagem):`,
    frames,
    ``,
    `Transcript do áudio${post.degraded ? " (INDISPONÍVEL: vídeo não baixou, use só frames+legenda)" : ""}:`,
    transcript ? transcript.slice(0, 4000) : "(sem transcript)",
    ``,
    `Tarefa: leia os frames e o transcript e devolva SÓ um objeto JSON (sem texto fora dele) com:`,
    `- hook: o gancho literal dos primeiros segundos (fala ou texto na tela). Se não der pra saber, "—".`,
    `- visualFormat: formato visual em poucas palavras (ex: "talking head listical", "b-roll narrado", "carrossel de dicas").`,
    `- topic: o tópico central em uma linha.`,
    `- whyItWorked: 2 a 3 frases sobre por que provavelmente performou, ancoradas no que os frames/transcript mostram.`,
    `- transcript: o transcript recebido (repita), ou null.`,
    ``,
    `Regra: NÃO invente. Escreva em PT-BR, sem travessões. Responda apenas o JSON.`,
  ].join("\n");
}

export function parseAnalysisJson(raw: string, shortcode: string): PostAnalysis {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`parseAnalysisJson: sem JSON para ${shortcode}`);
  const obj = JSON.parse(text.slice(start, end + 1));
  for (const key of ["hook", "visualFormat", "topic", "whyItWorked"]) {
    if (typeof obj[key] !== "string") throw new Error(`parseAnalysisJson: campo '${key}' ausente para ${shortcode}`);
  }
  return {
    shortcode,
    hook: obj.hook,
    visualFormat: obj.visualFormat,
    topic: obj.topic,
    whyItWorked: obj.whyItWorked,
    transcript: typeof obj.transcript === "string" ? obj.transcript : null,
  };
}
