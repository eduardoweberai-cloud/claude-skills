import { describe, it, expect } from "vitest";
import type { CompetitorPost, RankedPost, PreparedPost } from "./types.ts";

describe("types", () => {
  it("CompetitorPost carries media fields", () => {
    const p: CompetitorPost = {
      shortcode: "abc", permalink: "https://instagram.com/p/abc/", timestamp: "2026-07-15T12:00:00Z",
      type: "reel", caption: "oi", likes: 100, comments: 5, views: 2000,
      thumbnailUrl: "https://x/t.jpg", videoUrl: "https://x/v.mp4", images: [], ownerUsername: "foo",
      videoDuration: 30, isPinned: false,
    };
    expect(p.videoUrl).toContain(".mp4");
  });
  it("RankedPost extends with scores", () => {
    const r = { engagement: 105, engagementOutlier: 3.2, viewOutlier: 2.1, engagementRate: 0.05, rank: 1 } as Partial<RankedPost>;
    expect(r.rank).toBe(1);
  });
});
