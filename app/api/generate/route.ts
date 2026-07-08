import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { generateWeekPlan } from "@/lib/agent";
import { isHiggsfieldConfigured, startHfGeneration } from "@/lib/higgsfield";

export async function POST() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await generateWeekPlan();
  // с настроенным Higgsfield фото к новым черновикам генерируются сразу, в фоне
  let photos = false;
  if (isHiggsfieldConfigured()) {
    photos = true;
    result.ids.forEach((id, i) => setTimeout(() => startHfGeneration(id), i * 4000));
  }
  return NextResponse.json({ ...result, photos });
}
