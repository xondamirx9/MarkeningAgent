import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import type { CoverFormat } from "./types";

export const COVER_DIMS: Record<CoverFormat, [number, number]> = {
  reels: [1080, 1920],
  ig_post: [1080, 1350],
  tg_post: [1280, 720],
};

// Same deterministic backdrop as components/Cover.tsx
function backdrop(destination: string): string {
  let h = 0;
  for (const ch of destination) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(160deg, hsl(${h}, 42%, 22%) 0%, hsl(${(h + 40) % 360}, 48%, 38%) 55%, hsl(${(h + 80) % 360}, 40%, 30%) 100%)`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface CoverVars {
  format: CoverFormat;
  title: string;
  destination: string;
  price: string;
  badge: string;
  brandName: string;
  primary: string;
  accent: string;
  /** absolute path to an uploaded jpg/png used as the background */
  mediaFile?: string | null;
}

export function coverHtml(v: CoverVars): string {
  const [w, h] = COVER_DIMS[v.format];
  let mediaTag = "";
  if (v.mediaFile && fs.existsSync(v.mediaFile) && /\.(jpe?g|png)$/i.test(v.mediaFile)) {
    const mime = path.extname(v.mediaFile).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
    const data = fs.readFileSync(v.mediaFile).toString("base64");
    mediaTag = `<img src="data:${mime};base64,${data}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: ${w}px; height: ${h}px; overflow: hidden; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  </style></head><body>
  <div style="position:relative;width:${w}px;height:${h}px;background:${backdrop(v.destination)};overflow:hidden">
    ${mediaTag}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,.55) 100%)"></div>
    <div style="position:absolute;top:${h * 0.045}px;left:${w * 0.06}px;background:${esc(v.primary)};color:#fff;padding:14px 30px;border-radius:999px;font-size:34px;font-weight:700;letter-spacing:.5px">✈️ ${esc(v.brandName)}</div>
    ${v.badge ? `<div style="position:absolute;top:${h * 0.045}px;right:${w * 0.06}px;background:${esc(v.accent)};color:#111;padding:14px 30px;border-radius:999px;font-size:34px;font-weight:800;text-transform:uppercase">${esc(v.badge)}</div>` : ""}
    <div style="position:absolute;left:${w * 0.06}px;right:${w * 0.06}px;bottom:${h * 0.05}px">
      <div style="color:#fff;opacity:.85;font-size:40px;font-weight:600;margin-bottom:12px">${esc(v.destination)}</div>
      <div style="color:#fff;font-size:${v.format === "tg_post" ? 64 : 76}px;font-weight:800;line-height:1.12;text-shadow:0 4px 24px rgba(0,0,0,.45)">${esc(v.title)}</div>
      ${v.price ? `<div style="display:inline-block;margin-top:28px;background:#fff;color:#111;padding:16px 36px;border-radius:16px;font-size:52px;font-weight:800">${esc(v.price)}</div>` : ""}
    </div>
  </div></body></html>`;
}

/**
 * Screenshots the cover HTML at native resolution. Chromium is resolved from
 * CHROMIUM_PATH, then the Playwright browsers registry (PLAYWRIGHT_BROWSERS_PATH);
 * locally run `npx playwright-core install chromium` or point CHROMIUM_PATH
 * at any installed Chrome/Chromium binary.
 */
function findChromium(): string | undefined {
  const candidates = [
    process.env.CHROMIUM_PATH,
    process.env.PLAYWRIGHT_BROWSERS_PATH &&
      path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, "chromium"),
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter((c): c is string => !!c);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return undefined; // fall back to the Playwright registry
}

export async function renderCoverPng(v: CoverVars): Promise<Buffer> {
  const [w, h] = COVER_DIMS[v.format];
  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(coverHtml(v), { waitUntil: "networkidle" });
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
