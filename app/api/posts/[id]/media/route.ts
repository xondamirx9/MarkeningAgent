import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { isAuthed } from "@/lib/auth";
import { getPost, updatePost } from "@/lib/db";
import { normalizePhoto, TG_VIDEO_LIMIT } from "@/lib/media";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm"]);
const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const post = getPost(Number(id));
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file too large" }, { status: 413 });

  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXT.has(ext) && !VIDEO_EXT.has(ext)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  }

  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  let saveExt = ext;
  if (IMAGE_EXT.has(ext)) {
    // Telegram sendPhoto принимает максимум 10 МБ — сжимаем при загрузке
    try {
      buf = await normalizePhoto(buf);
      saveExt = ".jpg";
    } catch {
      return NextResponse.json({ error: "не удалось обработать изображение" }, { status: 415 });
    }
  } else if (buf.length > TG_VIDEO_LIMIT) {
    return NextResponse.json(
      { error: "Видео больше 50 МБ — Telegram не примет. Сожмите ролик и загрузите снова." },
      { status: 413 }
    );
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `post-${id}-${Date.now()}${saveExt}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);

  // drop the previous file for this post, if any
  if (post.media_path) {
    const old = path.join(UPLOAD_DIR, path.basename(post.media_path));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  updatePost(Number(id), { media_path: name });
  return NextResponse.json({ ok: true, media_path: name });
}
