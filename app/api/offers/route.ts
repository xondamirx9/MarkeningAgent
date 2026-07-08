import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { insertOffer, listOffers } from "@/lib/db";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(listOffers());
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { destination?: string; price?: string; details?: string; hot?: boolean };
  if (!body.destination?.trim()) {
    return NextResponse.json({ error: "Укажите направление" }, { status: 400 });
  }
  const id = insertOffer({
    destination: body.destination.trim(),
    price: body.price?.trim() ?? "",
    details: body.details?.trim() ?? "",
    hot: body.hot ? 1 : 0,
  });
  return NextResponse.json({ ok: true, id });
}
