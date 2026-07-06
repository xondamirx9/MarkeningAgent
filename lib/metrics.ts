import { db, getMetrics } from "./db";

/**
 * Daily metrics collection, called from /api/cron. Telegram Bot API exposes
 * only the channel member count (views/reactions need MTProto or manual
 * входные данные), so followers are collected live and reach/engagement keep
 * their last known value until better sources are wired in.
 */
export async function collectDailyMetrics(): Promise<{ telegram: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return { telegram: false };

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`
    );
    const data = (await res.json()) as { ok: boolean; result?: number };
    if (!data.ok || typeof data.result !== "number") return { telegram: false };

    const today = new Date().toISOString().slice(0, 10);
    const last = getMetrics(7).filter((m) => m.channel === "telegram").at(-1);
    db.prepare(
      `INSERT INTO metrics (date, channel, followers, reach, engagement)
       VALUES (?, 'telegram', ?, ?, ?)
       ON CONFLICT(date, channel) DO UPDATE SET followers = excluded.followers`
    ).run(today, data.result, last?.reach ?? 0, last?.engagement ?? 0);
    return { telegram: true };
  } catch (err) {
    console.error("[metrics] telegram collection failed:", err);
    return { telegram: false };
  }
}
