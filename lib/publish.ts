import fs from "node:fs";
import path from "node:path";
import { getPost, getSettings, updatePost } from "./db";
import type { Post } from "./types";

const CAPTION_LIMIT = 1024;

async function tgSend(method: string, body: FormData | Record<string, unknown>): Promise<Response> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const isForm = body instanceof FormData;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: isForm ? undefined : { "content-type": "application/json" },
        body: isForm ? body : JSON.stringify(body),
      });
      if (res.status === 429) {
        const data = (await res.json()) as { parameters?: { retry_after?: number } };
        await new Promise((r) => setTimeout(r, (data.parameters?.retry_after ?? 3) * 1000));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function mediaMethodFor(file: string): { method: string; field: string } | null {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") return { method: "sendPhoto", field: "photo" };
  if (ext === ".mp4" || ext === ".mov") return { method: "sendVideo", field: "video" };
  if (ext === ".webm") return { method: "sendDocument", field: "document" };
  return null;
}

/** Renders the branded cover to PNG; null when Chromium isn't available. */
async function tryRenderCover(post: Post): Promise<Buffer | null> {
  try {
    const { renderCoverPng } = await import("./cover-render");
    const s = getSettings();
    return await renderCoverPng({
      format: post.cover_format,
      title: post.cover_title || post.title,
      destination: post.destination,
      price: post.price,
      badge: post.badge,
      brandName: s.business.name,
      primary: s.brand.primary,
      accent: s.brand.accent,
      mediaFile: null,
    });
  } catch (err) {
    console.warn("[publish] cover render unavailable, falling back to text:", err);
    return null;
  }
}

export interface PublishResult {
  ok: boolean;
  telegram: "sent" | "skipped" | "error";
  media: "uploaded" | "cover" | "none";
  instagram: "manual" | "skipped";
  error?: string;
}

/**
 * Publishes a post right now.
 *
 * Telegram (когда настроены TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID):
 *  - загружено фото/видео из Higgsfield → уходит sendPhoto/sendVideo;
 *  - медиа нет → платформа рендерит брендированную обложку в PNG и шлёт её
 *    (нужен Chromium; без него пост уходит текстом);
 *  - текст длиннее лимита подписи (1024) → медиа с заголовком + полный текст
 *    отдельным сообщением.
 *
 * Instagram требует Graph API (Business-аккаунт) — пока помечается
 * опубликованным, выкладывается вручную.
 */
export async function publishPost(id: number): Promise<PublishResult> {
  const post = getPost(id);
  if (!post)
    return { ok: false, telegram: "error", media: "none", instagram: "skipped", error: "Пост не найден" };

  const wantsTg = post.channel === "telegram" || post.channel === "both";
  const wantsIg = post.channel === "instagram" || post.channel === "both";
  const tgConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);

  let telegram: PublishResult["telegram"] = "skipped";
  let media: PublishResult["media"] = "none";

  if (wantsTg && tgConfigured) {
    try {
      const chatId = process.env.TELEGRAM_CHANNEL_ID!;
      const fullText = `${post.body_tg}\n\n${post.hashtags}`.trim();

      // 1) attachment: uploaded media, else auto-rendered branded cover
      let attach: { method: string; field: string; blob: Blob; name: string } | null = null;
      if (post.media_path) {
        const file = path.join(process.cwd(), "data", "uploads", path.basename(post.media_path));
        const m = mediaMethodFor(file);
        if (m && fs.existsSync(file)) {
          let data: Buffer = fs.readFileSync(file);
          if (m.method === "sendPhoto" && data.length > 10 * 1024 * 1024) {
            // страховка для файлов, загруженных до автосжатия
            const { normalizePhoto } = await import("./media");
            data = await normalizePhoto(data);
          }
          if (m.method !== "sendPhoto" && data.length > 50 * 1024 * 1024) {
            return {
              ok: false, telegram: "error", media: "uploaded", instagram: "skipped",
              error: "Видео больше 50 МБ — Telegram не примет. Сожмите ролик и загрузите заново.",
            };
          }
          attach = { ...m, blob: new Blob([new Uint8Array(data)]), name: path.basename(file) };
          media = "uploaded";
        }
      }
      if (!attach) {
        const png = await tryRenderCover(post);
        if (png) {
          attach = {
            method: "sendPhoto",
            field: "photo",
            blob: new Blob([new Uint8Array(png)], { type: "image/png" }),
            name: `cover-${post.id}.png`,
          };
          media = "cover";
        }
      }

      // 2) send
      let res: Response;
      if (attach) {
        const fitsCaption = fullText.length <= CAPTION_LIMIT;
        const form = new FormData();
        form.append("chat_id", chatId);
        form.append(attach.field, attach.blob, attach.name);
        form.append("caption", fitsCaption ? fullText : post.title);
        res = await tgSend(attach.method, form);
        if (res.ok && !fitsCaption) {
          // полный текст — отдельным сообщением следом за медиа
          res = await tgSend("sendMessage", { chat_id: chatId, text: fullText });
        }
      } else {
        res = await tgSend("sendMessage", { chat_id: chatId, text: fullText });
      }

      if (!res.ok) {
        const detail = await res.text();
        return { ok: false, telegram: "error", media, instagram: "skipped", error: `Telegram: ${detail.slice(0, 300)}` };
      }
      telegram = "sent";
    } catch (err) {
      return { ok: false, telegram: "error", media, instagram: "skipped", error: String(err) };
    }
  }

  updatePost(id, { status: "published", published_at: new Date().toISOString() });
  return { ok: true, telegram, media, instagram: wantsIg ? "manual" : "skipped" };
}

/** Publishes every approved/scheduled post whose time has come (used by /api/cron). */
export async function publishDue(): Promise<number> {
  const { listPosts } = await import("./db");
  if (!getSettings().posting.autopublish) return 0;
  const due = listPosts().filter(
    (p) =>
      (p.status === "scheduled" || p.status === "approved") &&
      p.scheduled_at &&
      new Date(p.scheduled_at).getTime() <= Date.now()
  );
  let published = 0;
  for (const p of due) {
    const res = await publishPost(p.id);
    if (res.ok) published++;
  }
  return published;
}
