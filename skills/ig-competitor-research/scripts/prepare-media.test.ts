import { describe, it, expect } from "vitest";
import { frameTimestamps, ffmpegFrameArgs, ffmpegAudioArgs, whisperArgs } from "./prepare-media.ts";

describe("prepare-media (pure helpers)", () => {
  it("distributes 5 frames across duration with hook near start", () => {
    const ts = frameTimestamps(30, 5);
    expect(ts).toHaveLength(5);
    expect(ts[0]).toBeCloseTo(2, 1);      // hook ~2s
    expect(ts[4]).toBeLessThan(30);        // last before end
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });
  it("clamps hook for very short videos", () => {
    const ts = frameTimestamps(3, 5);
    expect(ts[0]).toBeLessThan(1);         // 3*0.1 = 0.3
    expect(Math.max(...ts)).toBeLessThan(3);
  });
  it("builds ffmpeg frame args with seek before input", () => {
    const args = ffmpegFrameArgs("v.mp4", 2, "f.jpg");
    expect(args).toEqual(["-y", "-ss", "2", "-i", "v.mp4", "-frames:v", "1", "-q:v", "2", "f.jpg"]);
  });
  it("builds ffmpeg audio args at 16k mono wav", () => {
    expect(ffmpegAudioArgs("v.mp4", "a.wav")).toEqual(
      ["-y", "-i", "v.mp4", "-ar", "16000", "-ac", "1", "a.wav"]);
  });
  it("builds whisper args with small model, cpu int8, no language flag", () => {
    const args = whisperArgs("a.wav", "/out");
    expect(args).toContain("--model"); expect(args).toContain("small");
    expect(args).toContain("--device"); expect(args).toContain("cpu");
    expect(args).toContain("--compute_type"); expect(args).toContain("int8");
    expect(args).not.toContain("--language");
    expect(args).toContain("/out");
  });
});
