import fs from "node:fs";
import path from "node:path";
import { getPost, updatePost } from "./db";

async function tgCall(method: string, body: Record<string, unknown>): Promise<Response> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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

export interface PublishResult {
  ok: boolean;
  telegram: "sent" | "skipped" | "error";
  instagram: "manual" | "skipped";
  error?: string;
}

/**
 * Publishes a post right now. Telegram goes out via Bot API when
 * TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID are configured; Instagram
 * publishing requires the Graph API (Business account) and is left as a
 * manual step — the post is still marked published for the calendar.
 */
export async function publishPost(id: number): Promise<PublishResult> {
  const post = getPost(id);
  if (!post) return { ok: false, telegram: "error", instagram: "skipped", error: "Пост не найден" };

  const wantsTg = post.channel === "telegram" || post.channel === "both";
  const wantsIg = post.channel === "instagram" || post.channel === "both";
  const tgConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);

  let telegram: PublishResult["telegram"] = "skipped";
  if (wantsTg && tgConfigured) {
    try {
      const chatId = process.env.TELEGRAM_CHANNEL_ID!;
      const text = `${post.body_tg}\n\n${post.hashtags}`;
      let res: Response;
      const media = post.media_path ? path.join(process.cwd(), "data", "uploads", post.media_path) : null;
      if (media && fs.existsSync(media) && /\.(jpe?g|png)$/i.test(media)) {
        const form = new FormData();
        form.append("chat_id", chatId);
        form.append("caption", text.slice(0, 1024));
        form.append("photo", new Blob([fs.readFileSync(media)]), post.media_path!);
        res = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
          { method: "POST", body: form }
        );
      } else {
        res = await tgCall("sendMessage", { chat_id: chatId, text });
      }
      if (!res.ok) {
        const detail = await res.text();
        return { ok: false, telegram: "error", instagram: "skipped", error: `Telegram: ${detail.slice(0, 200)}` };
      }
      telegram = "sent";
    } catch (err) {
      return { ok: false, telegram: "error", instagram: "skipped", error: String(err) };
    }
  }

  updatePost(id, { status: "published", published_at: new Date().toISOString() });
  return { ok: true, telegram, instagram: wantsIg ? "manual" : "skipped" };
}

/** Publishes every approved/scheduled post whose time has come (used by /api/cron). */
export async function publishDue(): Promise<number> {
  const { listPosts, getSettings } = await import("./db");
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
