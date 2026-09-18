import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt, parseAnalysisJson } from "./analysis.ts";
import type { PreparedPost } from "./types.ts";

const prepared: PreparedPost = {
  shortcode: "abc", permalink: "https://instagram.com/p/abc/", timestamp: "2026-07-15T12:00:00Z",
  type: "reel", caption: "legenda", likes: 100, comments: 5, views: 2000, thumbnailUrl: null,
  videoUrl: null, images: [], ownerUsername: "foo", videoDuration: 30, isPinned: false,
  engagement: 105, engagementOutlier: 3.2, viewOutlier: 2.1, engagementRate: 0.05, rank: 1,
  mediaDir: "/m/abc", framePaths: ["/m/abc/frame_0.jpg", "/m/abc/frame_1.jpg"],
  transcriptPath: "/m/abc/audio.txt", degraded: false,
};

describe("analysis", () => {
  it("prompt includes frames, transcript, no-invention rule, JSON request", () => {
    const p = buildAnalysisPrompt(prepared, "olá pessoal hoje");
    expect(p).toContain("/m/abc/frame_0.jpg");
    expect(p).toContain("olá pessoal hoje");
    expect(p.toLowerCase()).toContain("json");
    expect(p.toLowerCase()).toContain("não invente");
    expect(p).toContain("@foo");
  });
  it("parses clean json", () => {
    const raw = '{"hook":"H","visualFormat":"talking head","topic":"T","whyItWorked":"W","transcript":"X"}';
    const a = parseAnalysisJson(raw, "abc");
    expect(a.shortcode).toBe("abc");
    expect(a.hook).toBe("H");
  });
  it("parses json inside code fences", () => {
    const raw = "aqui está:\n```json\n{\"hook\":\"H\",\"visualFormat\":\"v\",\"topic\":\"t\",\"whyItWorked\":\"w\",\"transcript\":null}\n```\n";
    const a = parseAnalysisJson(raw, "abc");
    expect(a.hook).toBe("H");
    expect(a.transcript).toBeNull();
  });
  it("throws on missing required field", () => {
    expect(() => parseAnalysisJson('{"hook":"H"}', "abc")).toThrow();
  });
});
