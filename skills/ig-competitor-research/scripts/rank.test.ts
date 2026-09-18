import { describe, it, expect } from "vitest";
import { engagementOf, median, rankPosts } from "./rank.ts";
import type { CompetitorPost } from "./types.ts";

function post(over: Partial<CompetitorPost>): CompetitorPost {
  return {
    shortcode: over.shortcode ?? "x", permalink: "p", timestamp: "2026-07-15T12:00:00Z",
    type: over.type ?? "reel", caption: null, likes: over.likes ?? 0, comments: over.comments ?? 0,
    views: over.views ?? null, thumbnailUrl: null, videoUrl: null, images: [],
    ownerUsername: over.ownerUsername ?? "foo", videoDuration: null, isPinned: false, ...over,
  };
}

describe("rank", () => {
  it("engagement sums likes+comments treating null as 0", () => {
    expect(engagementOf(post({ likes: 10, comments: 5 }))).toBe(15);
    expect(engagementOf(post({ likes: null as any, comments: 5 }))).toBe(5);
  });
  it("median handles even/odd/empty", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
  it("takes top 3 per handle then global top N", () => {
    const posts = [
      post({ shortcode: "a1", ownerUsername: "a", likes: 100 }),
      post({ shortcode: "a2", ownerUsername: "a", likes: 90 }),
      post({ shortcode: "a3", ownerUsername: "a", likes: 80 }),
      post({ shortcode: "a4", ownerUsername: "a", likes: 70 }), // dropped (4th of handle a)
      post({ shortcode: "b1", ownerUsername: "b", likes: 60 }),
    ];
    const ranked = rankPosts(posts, 3);
    expect(ranked).toHaveLength(3);
    expect(ranked.map((p) => p.shortcode)).toEqual(["a1", "a2", "a3"]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked.find((p) => p.shortcode === "a4")).toBeUndefined();
  });
  it("computes engagement outlier vs handle median", () => {
    const posts = [
      post({ shortcode: "a1", ownerUsername: "a", likes: 100 }), // eng 100
      post({ shortcode: "a2", ownerUsername: "a", likes: 20 }),  // eng 20
      post({ shortcode: "a3", ownerUsername: "a", likes: 10 }),  // eng 10 → median 20
    ];
    const ranked = rankPosts(posts, 10);
    const a1 = ranked.find((p) => p.shortcode === "a1")!;
    expect(a1.engagementOutlier).toBeCloseTo(5, 1); // 100/20
  });
  it("computes view outlier and engagement rate for videos", () => {
    const posts = [
      post({ shortcode: "v1", ownerUsername: "a", likes: 50, comments: 0, views: 1000, type: "reel" }),
      post({ shortcode: "v2", ownerUsername: "a", likes: 5, comments: 0, views: 100, type: "reel" }),
    ];
    const ranked = rankPosts(posts, 10);
    const v1 = ranked.find((p) => p.shortcode === "v1")!;
    expect(v1.viewOutlier).toBeCloseTo(1.82, 1); // 1000 / median(1000,100)=550
    expect(v1.engagementRate).toBeCloseTo(0.05, 3); // 50/1000
  });
});
