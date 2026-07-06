import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getPost } from "@/lib/db";
import { getHfJob, isHiggsfieldConfigured, startHfGeneration } from "@/lib/higgsfield";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!getPost(Number(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isHiggsfieldConfigured()) {
    return NextResponse.json(
      { error: "Higgsfield не настроен: добавьте HF_CREDENTIALS (KEY_ID:KEY_SECRET с cloud.higgsfield.ai) в переменные окружения" },
      { status: 501 }
    );
  }
  const result = startHfGeneration(Number(id));
  if (!result.started && result.reason === "already_running") {
    return NextResponse.json({ error: "Генерация уже идёт" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const post = getPost(Number(id));
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    configured: isHiggsfieldConfigured(),
    job: getHfJob(Number(id)),
    media_path: post.media_path,
  });
}
