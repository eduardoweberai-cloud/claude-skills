import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { RankedPost, PreparedPost } from "./types.ts";

export function frameTimestamps(duration: number, count: number): number[] {
  const d = duration > 0 ? duration : 10;
  const hook = Math.min(2, d * 0.1);
  const last = d * 0.92;
  if (count <= 1) return [hook];
  const out: number[] = [hook];
  for (let i = 1; i < count; i++) {
    out.push(hook + ((last - hook) * i) / (count - 1));
  }
  return out;
}

export function ffmpegFrameArgs(video: string, ts: number, out: string): string[] {
  return ["-y", "-ss", String(ts), "-i", video, "-frames:v", "1", "-q:v", "2", out];
}

export function ffmpegAudioArgs(video: string, out: string): string[] {
  return ["-y", "-i", video, "-ar", "16000", "-ac", "1", out];
}

export function whisperArgs(audio: string, outDir: string): string[] {
  return [
    audio, "--model", "small", "--device", "cpu", "--compute_type", "int8",
    "--threads", "12", "--output_format", "txt", "--output_dir", outDir,
  ];
}

export async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return false;
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

export async function prepareOne(post: RankedPost, baseDir: string): Promise<PreparedPost> {
  const mediaDir = path.join(baseDir, post.shortcode);
  fs.mkdirSync(mediaDir, { recursive: true });
  const base: PreparedPost = {
    ...post, mediaDir, framePaths: [], transcriptPath: null, degraded: false,
  };

  const isVideo = post.type === "reel" || post.type === "video";

  if (isVideo && post.videoUrl) {
    const videoPath = path.join(mediaDir, "video.mp4");
    const ok = await downloadFile(post.videoUrl, videoPath);
    if (ok) {
      // frames
      const stamps = frameTimestamps(post.videoDuration ?? 0, 5);
      stamps.forEach((ts, i) => {
        const out = path.join(mediaDir, `frame_${i}.jpg`);
        const r = spawnSync("ffmpeg", ffmpegFrameArgs(videoPath, ts, out), { stdio: "ignore" });
        if (r.status === 0 && fs.existsSync(out)) base.framePaths.push(out);
      });
      // transcript
      const audioPath = path.join(mediaDir, "audio.wav");
      const ra = spawnSync("ffmpeg", ffmpegAudioArgs(videoPath, audioPath), { stdio: "ignore" });
      if (ra.status === 0 && fs.existsSync(audioPath)) {
        const rw = spawnSync("whisper-ctranslate2", whisperArgs(audioPath, mediaDir), { stdio: "ignore" });
        const txt = path.join(mediaDir, "audio.txt");
        if (rw.status === 0 && fs.existsSync(txt)) base.transcriptPath = txt;
      }
      return base;
    }
  }

  // Fallback / non-video: thumbnail + carousel images.
  base.degraded = isVideo; // video that failed to download
  if (post.type === "carousel" && post.images.length > 0) {
    for (let i = 0; i < Math.min(4, post.images.length); i++) {
      const out = path.join(mediaDir, `img_${i}.jpg`);
      if (await downloadFile(post.images[i], out)) base.framePaths.push(out);
    }
  } else if (post.thumbnailUrl) {
    const out = path.join(mediaDir, "thumb.jpg");
    if (await downloadFile(post.thumbnailUrl, out)) base.framePaths.push(out);
  }
  return base;
}
