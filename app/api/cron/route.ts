import { NextResponse } from "next/server";
import { publishDue } from "@/lib/publish";

/**
 * Scheduler endpoint: call it every few minutes (system cron, Vercel Cron,
 * etc.). Publishes approved/scheduled posts whose time has come — only when
 * autopublish is enabled in settings. Protected by CRON_SECRET when set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const published = await publishDue();
  return NextResponse.json({ ok: true, published });
}
