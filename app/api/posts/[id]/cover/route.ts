import { NextResponse } from "next/server";
import path from "node:path";
import { isAuthed } from "@/lib/auth";
import { getPost, getSettings } from "@/lib/db";
import { renderCoverPng } from "@/lib/cover-render";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const post = getPost(Number(id));
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const s = getSettings();
  try {
    const png = await renderCoverPng({
      format: post.cover_format,
      title: post.title,
      destination: post.destination,
      price: post.price,
      badge: post.badge,
      brandName: s.business.name,
      primary: s.brand.primary,
      accent: s.brand.accent,
      mediaFile: post.media_path
        ? path.join(process.cwd(), "data", "uploads", path.basename(post.media_path))
        : null,
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `attachment; filename="cover-post-${post.id}-${post.cover_format}.png"`,
      },
    });
  } catch (err) {
    console.error("[cover] render failed:", err);
    return NextResponse.json({ error: "Не удалось отрендерить обложку" }, { status: 500 });
  }
}
