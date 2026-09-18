import { describe, it, expect } from "vitest";
import { mapApifyType, apifyItemToPost, isInRange, buildApifyInput } from "./scrape-multi.ts";

describe("scrape-multi", () => {
  it("maps apify types", () => {
    expect(mapApifyType({ type: "Reel" } as any)).toBe("reel");
    expect(mapApifyType({ productType: "clips" } as any)).toBe("reel");
    expect(mapApifyType({ type: "Sidecar" } as any)).toBe("carousel");
    expect(mapApifyType({ type: "Image" } as any)).toBe("photo");
  });
  it("preserves media fields", () => {
    const post = apifyItemToPost({
      shortCode: "abc", timestamp: "2026-07-15T12:00:00Z", type: "Video",
      likesCount: 10, commentsCount: 2, videoViewCount: 500,
      displayUrl: "https://x/t.jpg", videoUrl: "https://x/v.mp4",
      ownerUsername: "foo", videoDuration: 42,
    } as any);
    expect(post).not.toBeNull();
    expect(post!.videoUrl).toBe("https://x/v.mp4");
    expect(post!.ownerUsername).toBe("foo");
    expect(post!.videoDuration).toBe(42);
  });
  it("carousel keeps images", () => {
    const post = apifyItemToPost({
      shortCode: "car", timestamp: "2026-07-15T12:00:00Z", type: "Sidecar",
      images: ["https://x/1.jpg", "https://x/2.jpg"], ownerUsername: "foo",
    } as any);
    expect(post!.images).toHaveLength(2);
    expect(post!.type).toBe("carousel");
  });
  it("rejects items without shortcode or timestamp", () => {
    expect(apifyItemToPost({ timestamp: "2026-07-15T12:00:00Z" } as any)).toBeNull();
    expect(apifyItemToPost({ shortCode: "x" } as any)).toBeNull();
  });
  it("range check is inclusive on both ends", () => {
    expect(isInRange("2026-07-15T00:00:00Z", "2026-07-15", "2026-07-15")).toBe(true);
    expect(isInRange("2026-07-14T23:00:00Z", "2026-07-15", "2026-07-20")).toBe(false);
  });
  it("builds apify input with all handle urls", () => {
    const input = buildApifyInput(["foo", "bar"], "2026-07-11", "2026-07-18", 60);
    expect(input.directUrls).toEqual([
      "https://www.instagram.com/foo/",
      "https://www.instagram.com/bar/",
    ]);
    expect(input.resultsLimit).toBe(60);
    expect(input.onlyPostsNewerThan).toBe("2026-07-11");
  });
});
