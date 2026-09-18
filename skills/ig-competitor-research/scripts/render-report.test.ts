import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { escapeHtml, fmtNum, buildReportHtml, sortByOutlier } from "./render-report.ts";
import type { PreparedBundle, PostAnalysis, PreparedPost } from "./types.ts";

function prepared(shortcode: string, over: Partial<PreparedPost> = {}): PreparedPost {
  return {
    shortcode, permalink: `https://instagram.com/p/${shortcode}/`, timestamp: "2026-07-15T12:00:00Z",
    type: "reel", caption: "c", likes: 100, comments: 5, views: 2000, thumbnailUrl: null,
    videoUrl: null, images: [], ownerUsername: "foo", videoDuration: 30, isPinned: false,
    engagement: 105, engagementOutlier: 3.2, viewOutlier: 2.1, engagementRate: 0.05, rank: 1,
    mediaDir: "/m", framePaths: [], transcriptPath: null, degraded: false, ...over,
  };
}
const bundle: PreparedBundle = {
  config: { slug: "teste", handles: ["foo"], from: "2026-07-11", to: "2026-07-18", topN: 15, capPerHandle: 60 },
  generatedAt: "2026-07-18T10:00:00Z",
  posts: [prepared("abc")],
};
const analyses: PostAnalysis[] = [
  { shortcode: "abc", hook: "Meu <hook>", visualFormat: "talking head", topic: "T", whyItWorked: "W", transcript: "linha do transcript" },
];

describe("render-report", () => {
  it("escapes html", () => {
    expect(escapeHtml("<b>&x")).toBe("&lt;b&gt;&amp;x");
  });
  it("formats numbers", () => {
    expect(fmtNum(2000)).toBe("2.000");
    expect(fmtNum(null)).toBe("—");
  });
  it("builds self-contained html with card, transcript, print-color-adjust", () => {
    const html = buildReportHtml(bundle, analyses);
    expect(html).toContain("print-color-adjust:exact");
    expect(html).toContain("@foo");
    expect(html).toContain("Meu &lt;hook&gt;");        // escaped hook
    expect(html).toContain("linha do transcript");      // copyable transcript
    expect(html).toContain("3.2x");                      // outlier
    expect(html).toContain("https://instagram.com/p/abc/");
    expect(html).not.toContain("http://");               // no external deps
    expect(html).not.toContain("file:///");               // no local file refs
  });

  it("embeds local frame image as base64 data URI, never file:///", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ig-competitor-research-test-"));
    const framePath = path.join(tmpDir, "frame.jpg");
    fs.writeFileSync(framePath, Buffer.from("fake-jpeg-bytes"));
    try {
      const bundleWithFrame: PreparedBundle = {
        ...bundle,
        posts: [prepared("abc", { framePaths: [framePath] })],
      };
      const html = buildReportHtml(bundleWithFrame, analyses);
      expect(html).toContain("data:image");
      expect(html).not.toContain("file:///");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("sorts posts by engagement outlier desc, nulls last", () => {
    const posts = [
      prepared("low", { engagementOutlier: 1.5 }),
      prepared("none", { engagementOutlier: null }),
      prepared("high", { engagementOutlier: 9.0 }),
      prepared("mid", { engagementOutlier: 4.0 }),
    ];
    const sorted = sortByOutlier(posts);
    expect(sorted.map((p) => p.shortcode)).toEqual(["high", "mid", "low", "none"]);
  });

  it("embeds ALL frames of a post, not just the first", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ig-competitor-research-test-"));
    const paths = [0, 1, 2, 3, 4].map((i) => {
      const fp = path.join(tmpDir, `frame_${i}.jpg`);
      fs.writeFileSync(fp, Buffer.from(`fake-jpeg-${i}`));
      return fp;
    });
    try {
      const b: PreparedBundle = { ...bundle, posts: [prepared("abc", { framePaths: paths })] };
      const html = buildReportHtml(b, analyses);
      const count = (html.match(/data:image\/jpeg;base64,/g) ?? []).length;
      expect(count).toBe(5);
      expect(html).toContain("hook");   // first frame label
      expect(html).toContain("fim");    // last frame label
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("renders the caption as copyable text", () => {
    const b: PreparedBundle = { ...bundle, posts: [prepared("abc", { caption: "legenda do post aqui" })] };
    const html = buildReportHtml(b, analyses);
    expect(html).toContain("legenda do post aqui");
    expect(html).toContain("Legenda original");
  });
});
