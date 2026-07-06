export const fmtNum = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

export const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : "—";

export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  approved: "Одобрен",
  scheduled: "Запланирован",
  published: "Опубликован",
  rejected: "Отклонён",
};

export const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  both: "TG + IG",
};

export const RUBRIC_EMOJI: Record<string, string> = {
  hot: "🔥",
  guide: "🌍",
  review: "⭐",
  backstage: "🎬",
  promo: "🎁",
  trend: "🎥",
};
