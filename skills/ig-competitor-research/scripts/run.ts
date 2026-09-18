import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dayjs from "dayjs";
import { loadEnv } from "./load-env.ts";
import { resolveHandles } from "./resolve-handles.ts";
import { scrapeMulti } from "./scrape-multi.ts";
import { rankPosts } from "./rank.ts";
import { prepareOne } from "./prepare-media.ts";
import { buildReportHtml, buildReportJson } from "./render-report.ts";
import type { PostAnalysis, PreparedBundle, PreparedPost, RunConfig } from "./types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, "..");

export function defaultRange(todayIso: string): { from: string; to: string } {
  const to = dayjs(todayIso);
  return { from: to.subtract(7, "day").format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
}

export function parseArgs(argv: string[]): {
  mode: "prepare" | "render"; slug: string; handles: string[]; from?: string; to?: string; topN: number;
} {
  const mode = argv.includes("--render") ? "render" : "prepare";
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i !== -1 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  const handlesRaw = get("--handles");
  return {
    mode,
    slug: get("--slug") ?? "run",
    handles: handlesRaw ? handlesRaw.split(",").map((h) => h.trim()).filter(Boolean) : [],
    from: get("--from"),
    to: get("--to"),
    topN: get("--top") ? parseInt(get("--top")!, 10) : 15,
  };
}

function outDir(slug: string): string {
  const day = process.env.RUN_DATE ?? dayjs().format("YYYY-MM-DD");
  return path.join(SKILL_DIR, "outputs", slug, day);
}

/**
 * Resolve o diretório real de um run já preparado. Diferente de outDir (que assume "hoje"),
 * isso lida com --render rodando em um dia diferente de --prepare: procura, entre os
 * subdiretórios de data de outputs/<slug>/, o mais recente que contenha prepared.json.
 */
export function resolveRunDir(slug: string, outputsBase?: string): string {
  const base = outputsBase ?? path.join(SKILL_DIR, "outputs");
  if (process.env.RUN_DATE) {
    return path.join(base, slug, process.env.RUN_DATE);
  }
  const slugDir = path.join(base, slug);
  if (!fs.existsSync(slugDir)) {
    throw new Error(`Nenhum prepared.json encontrado para o slug ${slug}. Rode --prepare primeiro.`);
  }
  const dates = fs
    .readdirSync(slugDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(slugDir, name, "prepared.json")))
    .sort((x, y) => (x < y ? 1 : x > y ? -1 : 0));
  if (dates.length === 0) {
    throw new Error(`Nenhum prepared.json encontrado para o slug ${slug}. Rode --prepare primeiro.`);
  }
  return path.join(slugDir, dates[0]);
}

/** Verifica se os binários externos necessários (ffmpeg, whisper-ctranslate2) estão no PATH. */
export function checkBinaries(): string[] {
  const missing: string[] = [];
  const check = (bin: string, args: string[]): void => {
    const r = spawnSync(bin, args, { stdio: "ignore" });
    if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT") {
      missing.push(bin);
    }
  };
  check("ffmpeg", ["-version"]);
  check("whisper-ctranslate2", ["--help"]);
  return missing;
}

/**
 * Compara shortcodes de prepared.json e analysis.json pra detectar mismatch silencioso.
 */
export function diffShortcodes(
  preparedShortcodes: string[],
  analysisShortcodes: string[]
): { missingAnalysis: string[]; orphanAnalysis: string[] } {
  const preparedSet = new Set(preparedShortcodes);
  const analysisSet = new Set(analysisShortcodes);
  return {
    missingAnalysis: preparedShortcodes.filter((s) => !analysisSet.has(s)),
    orphanAnalysis: analysisShortcodes.filter((s) => !preparedSet.has(s)),
  };
}

async function runPrepare(a: ReturnType<typeof parseArgs>): Promise<void> {
  loadEnv(SKILL_DIR);
  const missingBinaries = checkBinaries();
  if (missingBinaries.length > 0) {
    throw new Error(
      `Binário(s) ausente(s) no PATH: ${missingBinaries.join(", ")}. Instale e garanta que estão acessíveis no PATH antes de rodar --prepare.`
    );
  }
  const filePath = path.join(SKILL_DIR, "data", "competitors", `${a.slug}.txt`);
  const fileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : undefined;
  const handles = resolveHandles({ slug: a.slug, inline: a.handles, fileContent });
  const range = a.from && a.to ? { from: a.from, to: a.to } : defaultRange(dayjs().format("YYYY-MM-DD"));
  const config: RunConfig = { slug: a.slug, handles, ...range, topN: a.topN, capPerHandle: 60 };

  const posts = await scrapeMulti(config);
  const ranked = rankPosts(posts, a.topN);
  const dir = outDir(a.slug);
  const mediaBase = path.join(dir, "media");
  fs.mkdirSync(mediaBase, { recursive: true });

  const prepared: PreparedPost[] = [];
  for (const p of ranked) {
    console.log(`[prepare] ${p.rank}/${ranked.length} @${p.ownerUsername} ${p.shortcode}`);
    prepared.push(await prepareOne(p, mediaBase));
  }
  const bundle: PreparedBundle = { config, generatedAt: new Date().toISOString(), posts: prepared };
  fs.writeFileSync(path.join(dir, "prepared.json"), JSON.stringify(bundle, null, 2));
  console.log(`\n[prepare] OK. prepared.json em ${dir}`);
  console.log(`[prepare] Próximo: dispare 1 subagente por post (ver SKILL.md), salve analysis.json em ${dir}, depois rode --render.`);
}

function runRender(a: ReturnType<typeof parseArgs>): void {
  const dir = resolveRunDir(a.slug);
  const bundle = JSON.parse(fs.readFileSync(path.join(dir, "prepared.json"), "utf8")) as PreparedBundle;
  const analysesRaw: unknown = JSON.parse(fs.readFileSync(path.join(dir, "analysis.json"), "utf8"));
  if (!Array.isArray(analysesRaw)) {
    throw new Error("analysis.json deve ser um array de análises, uma por post.");
  }
  const analyses = analysesRaw as PostAnalysis[];

  const { missingAnalysis, orphanAnalysis } = diffShortcodes(
    bundle.posts.map((p) => p.shortcode),
    analyses.map((a2) => a2.shortcode)
  );
  if (missingAnalysis.length > 0) {
    console.warn(`[render] Posts sem análise correspondente (shortcode não encontrado em analysis.json): ${missingAnalysis.join(", ")}`);
  }
  if (orphanAnalysis.length > 0) {
    console.warn(`[render] Análises órfãs (shortcode em analysis.json que não existe em prepared.json): ${orphanAnalysis.join(", ")}`);
  }

  const html = buildReportHtml(bundle, analyses);
  fs.writeFileSync(path.join(dir, "report.html"), html);
  fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify(buildReportJson(bundle, analyses), null, 2));
  console.log(`[render] OK. report.html em ${dir}`);
}

async function main(): Promise<void> {
  const a = parseArgs(process.argv.slice(2));
  if (a.mode === "prepare") await runPrepare(a);
  else runRender(a);
}

// Only run main when executed directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith("run.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
