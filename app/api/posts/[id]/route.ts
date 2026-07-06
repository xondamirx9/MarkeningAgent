import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getPost, updatePost } from "@/lib/db";
import type { Post } from "@/lib/types";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const post = getPost(Number(id));
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!getPost(Number(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch = (await req.json()) as Partial<Post>;
  updatePost(Number(id), patch);
  return NextResponse.json({ ok: true });
}
