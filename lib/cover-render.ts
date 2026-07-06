import fs from "node:fs";
import path from "node:path";
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import type { CoverFormat } from "./types";

export const COVER_DIMS: Record<CoverFormat, [number, number]> = {
  reels: [1080, 1920],
  ig_post: [1080, 1350],
  tg_post: [1280, 720],
};

// DejaVu покрывает кириллицу и глиф ✈; шрифты идут с npm-пакетом,
// поэтому рендер работает на любом хостинге без браузера и системных шрифтов
const FONT_DIR = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "DejaVuSans.ttf"), "Cover");
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "DejaVuSans-Bold.ttf"), "Cover");
  fontsReady = true;
}

// Same deterministic backdrop as components/Cover.tsx
function backdropColors(destination: string): [string, string, string] {
  let h = 0;
  for (const ch of destination) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return [
    `hsl(${h}, 42%, 22%)`,
    `hsl(${(h + 40) % 360}, 48%, 38%)`,
    `hsl(${(h + 80) % 360}, 40%, 30%)`,
  ];
}

function roundedRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPill(
  ctx: SKRSContext2D,
  opts: { text: string; font: string; x?: number; right?: number; y: number; padX: number; padY: number; bg: string; color: string }
): { width: number; height: number } {
  ctx.font = opts.font;
  const m = ctx.measureText(opts.text);
  const textH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const w = m.width + opts.padX * 2;
  const h = textH + opts.padY * 2;
  const x = opts.right !== undefined ? opts.right - w : (opts.x ?? 0);
  ctx.fillStyle = opts.bg;
  roundedRect(ctx, x, opts.y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = opts.color;
  ctx.fillText(opts.text, x + opts.padX, opts.y + opts.padY + m.actualBoundingBoxAscent);
  return { width: w, height: h };
}

// DejaVu не содержит цветных эмодзи — убираем их из текста обложки,
// чтобы вместо 🔥/🌍 не рисовались пустые квадраты (✈ U+2708 в шрифте есть)
function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function wrapLines(ctx: SKRSContext2D, text: string, font: string, maxWidth: number): string[] {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
}

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

export async function renderCoverPng(raw: CoverVars): Promise<Buffer> {
  ensureFonts();
  const v: CoverVars = {
    ...raw,
    title: stripEmoji(raw.title),
    destination: stripEmoji(raw.destination),
    badge: stripEmoji(raw.badge),
    brandName: stripEmoji(raw.brandName),
    price: stripEmoji(raw.price),
  };
  const [w, h] = COVER_DIMS[v.format];
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // background: photo or deterministic gradient
  let photoDrawn = false;
  if (v.mediaFile && fs.existsSync(v.mediaFile) && /\.(jpe?g|png)$/i.test(v.mediaFile)) {
    try {
      const img = await loadImage(v.mediaFile);
      const scale = Math.max(w / img.width, h / img.height); // cover-fit
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      photoDrawn = true;
    } catch {
      /* fall back to gradient */
    }
  }
  if (!photoDrawn) {
    const [c1, c2, c3] = backdropColors(v.destination);
    const grad = ctx.createLinearGradient(0, 0, w * 0.35, h);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.55, c2);
    grad.addColorStop(1, c3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // scrim so text stays readable
  const scrim = ctx.createLinearGradient(0, 0, 0, h);
  scrim.addColorStop(0, "rgba(0,0,0,0.35)");
  scrim.addColorStop(0.35, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);

  const margin = w * 0.06;
  const topY = h * 0.045;

  // brand pill (top-left) + badge (top-right)
  drawPill(ctx, {
    text: `✈ ${v.brandName}`,
    font: "bold 34px Cover",
    x: margin,
    y: topY,
    padX: 30,
    padY: 16,
    bg: v.primary,
    color: "#ffffff",
  });
  if (v.badge) {
    drawPill(ctx, {
      text: v.badge.toUpperCase(),
      font: "bold 34px Cover",
      right: w - margin,
      y: topY,
      padX: 30,
      padY: 16,
      bg: v.accent,
      color: "#111111",
    });
  }

  // bottom block: destination → title → price (stacked from the bottom up)
  const titleSize = v.format === "tg_post" ? 64 : 76;
  const titleFont = `bold ${titleSize}px Cover`;
  const lines = wrapLines(ctx, v.title, titleFont, w - margin * 2);
  const lineH = titleSize * 1.12;

  let cursor = h - h * 0.05; // нижняя граница контента
  if (v.price) {
    ctx.font = "bold 52px Cover";
    const pm = ctx.measureText(v.price);
    const pillH = pm.actualBoundingBoxAscent + pm.actualBoundingBoxDescent + 32;
    cursor -= pillH;
    drawPill(ctx, {
      text: v.price,
      font: "bold 52px Cover",
      x: margin,
      y: cursor,
      padX: 36,
      padY: 16,
      bg: "#ffffff",
      color: "#111111",
    });
    cursor -= 28;
  }

  cursor -= lines.length * lineH;
  ctx.font = titleFont;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  lines.forEach((line, i) => {
    ctx.fillText(line, margin, cursor + (i + 0.85) * lineH);
  });
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.font = "bold 40px Cover";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(v.destination, margin, cursor - 18);

  return canvas.toBuffer("image/png");
}
