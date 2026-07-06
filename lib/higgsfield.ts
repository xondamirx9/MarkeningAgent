import fs from "node:fs";
import path from "node:path";
import { getPost, updatePost } from "./db";
import type { CoverFormat } from "./types";

export type HfStage = "image" | "video" | "download" | "done" | "error";

export interface HfJob {
  stage: HfStage;
  error?: string;
  startedAt: number;
}

// In-memory job tracker: generation runs detached from the HTTP request,
// the UI polls GET /api/posts/[id]/higgsfield. Lost on restart — by design.
const g = globalThis as unknown as { __hfJobs?: Map<number, HfJob> };
const jobs: Map<number, HfJob> = g.__hfJobs ?? (g.__hfJobs = new Map());

export function isHiggsfieldConfigured(): boolean {
  return !!(process.env.HF_CREDENTIALS || (process.env.HF_API_KEY && process.env.HF_API_SECRET));
}

export function getHfJob(postId: number): HfJob | null {
  return jobs.get(postId) ?? null;
}

// Soul supports fixed resolutions; pick the closest to each cover format
const SIZE_FOR_FORMAT: Record<CoverFormat, string> = {
  reels: "1152x2048", // 9:16
  ig_post: "1536x2048", // 3:4 (ближайший к 4:5)
  tg_post: "2048x1152", // 16:9
};

async function runPipeline(postId: number): Promise<void> {
  const post = getPost(postId);
  if (!post) throw new Error("Пост не найден");
  if (!post.higgsfield_prompt.trim()) throw new Error("У поста пустой промпт Higgsfield");

  const { createHiggsfieldClient } = await import("@higgsfield/client/v2");
  const client = createHiggsfieldClient({
    credentials:
      process.env.HF_CREDENTIALS || `${process.env.HF_API_KEY}:${process.env.HF_API_SECRET}`,
    maxPollTime: 10 * 60 * 1000,
  });

  // 1) Soul: cinematic keyframe from the brand prompt
  jobs.set(postId, { stage: "image", startedAt: Date.now() });
  const imageSet = await client.subscribe("/v1/text2image/soul", {
    input: {
      prompt: post.higgsfield_prompt,
      width_and_height: SIZE_FOR_FORMAT[post.cover_format] ?? "1152x2048",
      quality: "1080p",
      batch_size: 1,
    },
    withPolling: true,
  });
  if (imageSet.status !== "completed") {
    throw new Error(imageSet.status === "nsfw" ? "Модерация Higgsfield отклонила промпт (NSFW)" : `Генерация изображения не удалась (${imageSet.status})`);
  }
  const imageUrl = imageSet.images?.[0]?.url;
  if (!imageUrl) throw new Error("Higgsfield не вернул URL изображения");

  // 2) DoP: animate the keyframe into a video
  jobs.set(postId, { stage: "video", startedAt: Date.now() });
  const videoSet = await client.subscribe("/v1/image2video/dop", {
    input: {
      model: "dop-turbo",
      prompt: post.higgsfield_prompt,
      input_images: [{ type: "image_url", image_url: imageUrl }],
    },
    withPolling: true,
  });
  if (videoSet.status !== "completed") {
    throw new Error(videoSet.status === "nsfw" ? "Модерация Higgsfield отклонила видео (NSFW)" : `Генерация видео не удалась (${videoSet.status})`);
  }
  const videoUrl = videoSet.video?.url;
  if (!videoUrl) throw new Error("Higgsfield не вернул URL видео");

  // 3) download the result into the post's media slot
  jobs.set(postId, { stage: "download", startedAt: Date.now() });
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Не удалось скачать видео (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const name = `post-${postId}-hf-${Date.now()}.mp4`;
  fs.writeFileSync(path.join(dir, name), buf);

  const old = getPost(postId)?.media_path;
  if (old) {
    const oldFile = path.join(dir, path.basename(old));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }
  updatePost(postId, { media_path: name });
  jobs.set(postId, { stage: "done", startedAt: Date.now() });
}

/** Fire-and-forget: returns immediately, progress via getHfJob(). */
export function startHfGeneration(postId: number): { started: boolean; reason?: string } {
  if (!isHiggsfieldConfigured()) return { started: false, reason: "not_configured" };
  const current = jobs.get(postId);
  if (current && current.stage !== "done" && current.stage !== "error") {
    return { started: false, reason: "already_running" };
  }
  jobs.set(postId, { stage: "image", startedAt: Date.now() });
  runPipeline(postId).catch((err) => {
    console.error(`[higgsfield] generation for post ${postId} failed:`, err);
    jobs.set(postId, { stage: "error", error: String(err?.message ?? err), startedAt: Date.now() });
  });
  return { started: true };
}
