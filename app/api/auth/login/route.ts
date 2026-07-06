import { NextResponse } from "next/server";
import { checkCredentials, makeToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { login, password } = (await req.json()) as { login?: string; password?: string };
  if (!checkCredentials(login ?? "", password ?? "")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
