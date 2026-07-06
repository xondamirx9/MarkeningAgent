import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { generateWeekPlan } from "@/lib/agent";

export async function POST() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await generateWeekPlan();
  return NextResponse.json(result);
}
