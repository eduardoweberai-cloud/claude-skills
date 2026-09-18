import type { CompetitorPost, RankedPost } from "./types.ts";

export function engagementOf(p: CompetitorPost): number {
  return (p.likes ?? 0) + (p.comments ?? 0);
}

export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function groupByHandle(posts: CompetitorPost[]): Map<string, CompetitorPost[]> {
  const map = new Map<string, CompetitorPost[]>();
  for (const p of posts) {
    const arr = map.get(p.ownerUsername) ?? [];
    arr.push(p);
    map.set(p.ownerUsername, arr);
  }
  return map;
}

export function rankPosts(posts: CompetitorPost[], topN: number): RankedPost[] {
  const byHandle = groupByHandle(posts);

  // Per-handle medians for outlier scores.
  const engMedian = new Map<string, number>();
  const viewMedian = new Map<string, number>();
  for (const [handle, hp] of byHandle) {
    engMedian.set(handle, median(hp.map(engagementOf)));
    const views = hp.filter((p) => p.views != null).map((p) => p.views as number);
    viewMedian.set(handle, median(views));
  }

  // Top 3 per handle by engagement.
  const picks: CompetitorPost[] = [];
  for (const [, hp] of byHandle) {
    const top3 = [...hp].sort((a, b) => engagementOf(b) - engagementOf(a)).slice(0, 3);
    picks.push(...top3);
  }

  // Global re-rank by engagement, cut to topN.
  const sorted = picks.sort((a, b) => engagementOf(b) - engagementOf(a)).slice(0, topN);

  return sorted.map((p, i) => {
    const eng = engagementOf(p);
    const em = engMedian.get(p.ownerUsername) ?? 0;
    const vm = viewMedian.get(p.ownerUsername) ?? 0;
    const isVideo = p.type === "reel" || p.type === "video";
    return {
      ...p,
      engagement: eng,
      engagementOutlier: em > 0 ? eng / em : null,
      viewOutlier: isVideo && p.views != null && vm > 0 ? p.views / vm : null,
      engagementRate: isVideo && p.views != null && p.views > 0 ? eng / p.views : null,
      rank: i + 1,
    };
  });
}
