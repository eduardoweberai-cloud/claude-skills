// Scraper multi-handle via Apify, preserving videoUrl/images/ownerUsername/videoDuration (which apifyToPost drops).
import dayjs from "dayjs";
import type { CompetitorPost, PostType, RunConfig } from "./types.ts";

const APIFY_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items";

export interface ApifyItem {
  shortCode?: string;
  type?: string;              // "Image" | "Video" | "Sidecar" | "Reel"
  productType?: string;       // "feed" | "clips"
  caption?: string | null;
  url?: string;
  commentsCount?: number;
  likesCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  displayUrl?: string;
  videoUrl?: string;
  images?: string[];
  timestamp?: string;
  ownerUsername?: string;
  videoDuration?: number;
  isPinned?: boolean;
}

export function mapApifyType(item: ApifyItem): PostType {
  if (item.productType === "clips" || item.type === "Reel") return "reel";
  if (item.type === "Video") return "video";
  if (item.type === "Sidecar") return "carousel";
  if (item.type === "Image") return "photo";
  return "unknown";
}

export function apifyItemToPost(item: ApifyItem): CompetitorPost | null {
  if (!item.shortCode || !item.timestamp) return null;
  const ts = dayjs(item.timestamp);
  if (!ts.isValid()) return null;
  return {
    shortcode: item.shortCode,
    permalink: item.url ?? `https://www.instagram.com/p/${item.shortCode}/`,
    timestamp: ts.toISOString(),
    type: mapApifyType(item),
    caption: item.caption ?? null,
    likes: item.likesCount ?? null,
    comments: item.commentsCount ?? null,
    views: item.videoViewCount ?? item.videoPlayCount ?? null,
    thumbnailUrl: item.displayUrl ?? null,
    videoUrl: item.videoUrl ?? null,
    images: item.images ?? [],
    ownerUsername: item.ownerUsername ?? "",
    videoDuration: item.videoDuration ?? null,
    isPinned: item.isPinned === true,
  };
}

export function isInRange(timestamp: string, from: string, to: string): boolean {
  const dateOnly = timestamp.split("T")[0];
  return dateOnly >= from && dateOnly <= to;
}

export function buildApifyInput(
  handles: string[], from: string, to: string, cap: number,
): Record<string, unknown> {
  const olderThan = dayjs(to).add(1, "day").format("YYYY-MM-DD");
  return {
    directUrls: handles.map((h) => `https://www.instagram.com/${h}/`),
    resultsType: "posts",
    resultsLimit: cap,
    onlyPostsNewerThan: from,
    onlyPostsOlderThan: olderThan,
    addParentData: false,
  };
}

export async function scrapeMulti(config: RunConfig): Promise<CompetitorPost[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN não definido no ambiente (.env).");
  // cap total = per-handle cap × número de handles (Apify divide entre as URLs)
  const totalCap = config.capPerHandle * config.handles.length;
  const input = buildApifyInput(config.handles, config.from, config.to, totalCap);
  console.log(`[scrape] ${config.handles.length} handles, range ${config.from}..${config.to}, cap ${totalCap}`);
  const resp = await fetch(`${APIFY_ENDPOINT}?token=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Apify API error ${resp.status}: ${text.slice(0, 500)}`);
  }
  const items = (await resp.json()) as ApifyItem[];
  console.log(`[scrape] recebidos ${items.length} itens`);
  const posts = items
    .map(apifyItemToPost)
    .filter((p): p is CompetitorPost => p !== null)
    .filter((p) => isInRange(p.timestamp, config.from, config.to));
  console.log(`[scrape] ${posts.length} posts no range`);
  return posts;
}
