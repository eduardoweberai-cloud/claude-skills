export type PostType = "photo" | "video" | "reel" | "carousel" | "unknown";

export interface CompetitorPost {
  shortcode: string;
  permalink: string;
  timestamp: string;            // ISO 8601
  type: PostType;
  caption: string | null;
  likes: number | null;
  comments: number | null;
  views: number | null;         // only for reel/video
  thumbnailUrl: string | null;
  videoUrl: string | null;      // CDN, may expire
  images: string[];             // carousel image URLs
  ownerUsername: string;
  videoDuration: number | null; // seconds
  isPinned: boolean;
}

export interface RankedPost extends CompetitorPost {
  engagement: number;                 // likes + comments (nulls as 0)
  engagementOutlier: number | null;   // engagement / median(handle)
  viewOutlier: number | null;         // views / median(handle views), videos only
  engagementRate: number | null;      // (likes+comments)/views, videos only
  rank: number;                       // 1-based global rank
}

export interface PreparedPost extends RankedPost {
  mediaDir: string;
  framePaths: string[];
  transcriptPath: string | null;
  degraded: boolean;                  // true when videoUrl failed → thumb-only
}

export interface PostAnalysis {
  shortcode: string;
  hook: string;
  visualFormat: string;
  topic: string;
  whyItWorked: string;
  transcript: string | null;
}

export interface RunConfig {
  slug: string;                       // run identifier / competitors file name
  handles: string[];                  // normalized, no leading @
  from: string;                       // YYYY-MM-DD
  to: string;                         // YYYY-MM-DD
  topN: number;
  capPerHandle: number;
}

export interface PreparedBundle {
  config: RunConfig;
  generatedAt: string;
  posts: PreparedPost[];
}
