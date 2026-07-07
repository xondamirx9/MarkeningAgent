import { createCanvas, loadImage } from "@napi-rs/canvas";

const TG_PHOTO_LIMIT = 10 * 1024 * 1024; // sendPhoto: максимум 10 МБ
export const TG_VIDEO_LIMIT = 50 * 1024 * 1024; // sendVideo: максимум 50 МБ
const MAX_SIDE = 2560; // Telegram также требует width+height ≤ 10000

/**
 * Приводит фото к формату, который примет Telegram: уменьшает до 2560px по
 * длинной стороне и пережимает в JPEG, снижая качество, пока не влезет в 10 МБ.
 */
export async function normalizePhoto(input: Buffer): Promise<Buffer> {
  const img = await loadImage(input);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = createCanvas(w, h);
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);

  for (const quality of [90, 80, 70, 55]) {
    const out = Buffer.from(canvas.toBuffer("image/jpeg", quality));
    if (out.length <= TG_PHOTO_LIMIT) return out;
  }
  return Buffer.from(canvas.toBuffer("image/jpeg", 40));
}
