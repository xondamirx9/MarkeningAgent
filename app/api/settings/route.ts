import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/db";
import type { Settings } from "@/lib/types";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(getSettings());
}

export async function PATCH(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const patch = (await req.json()) as Partial<Settings>;
  const current = getSettings();
  saveSettings({
    business: { ...current.business, ...patch.business },
    brand: { ...current.brand, ...patch.brand },
    posting: { ...current.posting, ...patch.posting },
    rubrics: patch.rubrics ?? current.rubrics,
  });
  return NextResponse.json({ ok: true });
}
