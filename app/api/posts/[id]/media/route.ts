import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { isAuthed } from "@/lib/auth";
import { getPost, updatePost } from "@/lib/db";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const ALLOWED = new Set([".mp4", ".webm", ".jpg", ".jpeg", ".png"]);
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
  if (!ALLOWED.has(ext)) return NextResponse.json({ error: "unsupported type" }, { status: 415 });

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `post-${id}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  // drop the previous file for this post, if any
  if (post.media_path) {
    const old = path.join(UPLOAD_DIR, path.basename(post.media_path));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  updatePost(Number(id), { media_path: name });
  return NextResponse.json({ ok: true, media_path: name });
}
