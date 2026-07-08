import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteOffer, updateOffer } from "@/lib/db";
import type { Offer } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const patch = (await req.json()) as Partial<Offer>;
  updateOffer(Number(id), patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  deleteOffer(Number(id));
  return NextResponse.json({ ok: true });
}
