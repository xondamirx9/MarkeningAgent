import type { CoverFormat } from "@/lib/types";

const DIMS: Record<CoverFormat, [number, number]> = {
  reels: [1080, 1920],
  ig_post: [1080, 1350],
  tg_post: [1280, 720],
};

export const FORMAT_LABELS: Record<CoverFormat, string> = {
  reels: "Reels / обложка видео · 1080×1920",
  ig_post: "Пост Instagram · 1080×1350",
  tg_post: "Пост Telegram · 1280×720",
};

// Deterministic gradient backdrop per destination — stands in for the
// Higgsfield photo/video frame until media is uploaded.
function backdrop(destination: string): string {
  let h = 0;
  for (const ch of destination) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(160deg, hsl(${h}, 42%, 22%) 0%, hsl(${(h + 40) % 360}, 48%, 38%) 55%, hsl(${(h + 80) % 360}, 40%, 30%) 100%)`;
}

export interface CoverProps {
  format: CoverFormat;
  title: string;
  destination: string;
  price: string;
  badge?: string;
  brandName: string;
  primary: string;
  accent: string;
  mediaUrl?: string | null;
  /** rendered width in px; the cover is scaled down from its native size */
  width?: number;
}

export function Cover({
  format, title, destination, price, badge, brandName, primary, accent, mediaUrl, width = 220,
}: CoverProps) {
  const [w, h] = DIMS[format];
  const scale = width / w;
  const isVideo = mediaUrl ? /\.(mp4|webm|mov)$/i.test(mediaUrl) : false;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border"
      style={{ width: w * scale, height: h * scale }}
    >
      <div
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: backdrop(destination),
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {mediaUrl &&
          (isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={mediaUrl}
              muted
              loop
              autoPlay
              playsInline
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ))}
        {/* dark scrim so text stays readable over any media */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* brand tab */}
        <div
          style={{
            position: "absolute", top: h * 0.045, left: w * 0.06,
            background: primary, color: "#fff", padding: "14px 30px",
            borderRadius: 999, fontSize: 34, fontWeight: 700, letterSpacing: 0.5,
          }}
        >
          ✈️ {brandName}
        </div>
        {badge ? (
          <div
            style={{
              position: "absolute", top: h * 0.045, right: w * 0.06,
              background: accent, color: "#111", padding: "14px 30px",
              borderRadius: 999, fontSize: 34, fontWeight: 800, textTransform: "uppercase",
            }}
          >
            {badge}
          </div>
        ) : null}
        {/* caption block in the bottom third */}
        <div style={{ position: "absolute", left: w * 0.06, right: w * 0.06, bottom: h * 0.05 }}>
          <div style={{ color: "#fff", opacity: 0.85, fontSize: 40, fontWeight: 600, marginBottom: 12 }}>
            {destination}
          </div>
          <div
            style={{
              color: "#fff", fontSize: format === "tg_post" ? 64 : 76, fontWeight: 800,
              lineHeight: 1.12, textShadow: "0 4px 24px rgba(0,0,0,0.45)",
            }}
          >
            {title}
          </div>
          {price ? (
            <div
              style={{
                display: "inline-block", marginTop: 28, background: "#fff", color: "#111",
                padding: "16px 36px", borderRadius: 16, fontSize: 52, fontWeight: 800,
              }}
            >
              {price}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
