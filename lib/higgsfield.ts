import fs from "node:fs";
import path from "node:path";
import { getPost, updatePost } from "./db";
import type { CoverFormat } from "./types";

export type HfStage = "image" | "download" | "done" | "error";

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

  // Эндпоинты /v1/* принимают тело вида {params: {...}} — это интерфейс
  // v1-клиента SDK (v2 subscribe шлёт поля без обёртки и ловит
  // "body.params: Field required")
  const { HiggsfieldClient } = await import("@higgsfield/client");
  const [keyId, keySecret] = (
    process.env.HF_CREDENTIALS || `${process.env.HF_API_KEY}:${process.env.HF_API_SECRET}`
  ).split(":");
  const client = new HiggsfieldClient({
    apiKey: keyId,
    apiSecret: keySecret,
    maxPollTime: 10 * 60 * 1000,
  });

  // 1) Soul: cinematic photo from the brand prompt
  jobs.set(postId, { stage: "image", startedAt: Date.now() });
  const imageSet = await client.generate(
    "/v1/text2image/soul",
    {
      prompt: post.higgsfield_prompt,
      width_and_height: SIZE_FOR_FORMAT[post.cover_format] ?? "1152x2048",
      quality: "1080p",
      batch_size: 1,
    },
    { withPolling: true }
  );
  if (!imageSet.isCompleted) {
    throw new Error(imageSet.isNsfw ? "Модерация Higgsfield отклонила промпт (NSFW)" : "Генерация фото не удалась");
  }
  const imageUrl = imageSet.jobs[0]?.results?.raw?.url;
  if (!imageUrl) throw new Error("Higgsfield не вернул URL изображения");

  // 2) download and re-encode to JPEG (Soul может отдавать webp,
  // а Telegram sendPhoto и наш пайплайн ждут jpg/png)
  jobs.set(postId, { stage: "download", startedAt: Date.now() });
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Не удалось скачать фото (${res.status})`);
  let buf: Buffer = Buffer.from(await res.arrayBuffer());
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const img = await loadImage(buf);
    const canvas = createCanvas(img.width, img.height);
    canvas.getContext("2d").drawImage(img, 0, 0);
    buf = Buffer.from(canvas.toBuffer("image/jpeg", 92));
  } catch {
    /* не смогли перекодировать — сохраняем как есть */
  }
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const name = `post-${postId}-hf-${Date.now()}.jpg`;
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
