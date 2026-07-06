import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE = "ma_session";
const TTL_MS = 7 * 24 * 3600 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function makeToken(): string {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

export function checkCredentials(login: string, password: string): boolean {
  const expectedLogin = process.env.ADMIN_LOGIN || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
  return login === expectedLogin && password === expectedPassword;
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
