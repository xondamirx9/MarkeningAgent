import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getPost, updatePost, deletePost } from "@/lib/db";
import { publishPost } from "@/lib/publish";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  const post = getPost(id);
  if (!post) return NextResponse.json({ error: "Пост не найден" }, { status: 404 });

  const { action } = (await req.json()) as { action: string };
  switch (action) {
    case "approve":
      updatePost(id, { status: "scheduled" });
      return NextResponse.json({ ok: true });
    case "reject":
      updatePost(id, { status: "rejected" });
      return NextResponse.json({ ok: true });
    case "delete":
      deletePost(id);
      return NextResponse.json({ ok: true });
    case "publish": {
      const result = await publishPost(id);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
      return NextResponse.json(result);
    }
    default:
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }
}
