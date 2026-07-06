import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { isAuthed } from "@/lib/auth";

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  if (!(await isAuthed())) return new NextResponse("unauthorized", { status: 401 });
  const { name } = await ctx.params;
  const safe = path.basename(name);
  const file = path.join(process.cwd(), "data", "uploads", safe);
  if (!fs.existsSync(file)) return new NextResponse("not found", { status: 404 });
  const type = TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream";
  return new NextResponse(new Uint8Array(fs.readFileSync(file)), {
    headers: { "content-type": type, "cache-control": "private, max-age=3600" },
  });
}
