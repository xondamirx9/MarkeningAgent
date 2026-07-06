import Link from "next/link";
import { listPosts, getSettings } from "@/lib/db";
import { fmtDateTime, STATUS_LABELS, CHANNEL_LABELS, RUBRIC_EMOJI } from "@/lib/format";
import { Cover } from "@/components/Cover";
import { PostActions } from "@/components/PostActions";
import { GenerateButton } from "@/components/GenerateButton";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "draft", label: "На модерации" },
  { key: "scheduled", label: "Запланированы" },
  { key: "published", label: "Опубликованы" },
  { key: "rejected", label: "Отклонены" },
];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-warn/15 text-warn",
  scheduled: "bg-accent/10 text-accent",
  published: "bg-good/10 text-good",
  rejected: "bg-crit/10 text-crit",
};

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "draft" } = await searchParams;
  const posts = listPosts(tab);
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, listPosts(t.key).length])
  );
  const settings = getSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Модерация контента</h1>
        <GenerateButton />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/queue?tab=${t.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              tab === t.key ? "border-accent bg-accent/10 font-medium text-accent" : "text-ink2 hover:bg-card"
            }`}
          >
            {t.label} · {counts[t.key]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-ink2">
          Здесь пока пусто. Нажмите «Сгенерировать план на неделю» — агент создаст черновики.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row">
              <Link href={`/posts/${p.id}`} className="shrink-0">
                <Cover
                  format={p.cover_format}
                  title={p.title}
                  destination={p.destination}
                  price={p.price}
                  badge={p.badge}
                  brandName={settings.business.name}
                  primary={settings.brand.primary}
                  accent={settings.brand.accent}
                  mediaUrl={p.media_path ? `/api/media/${p.media_path}` : null}
                  width={150}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[p.status] ?? ""}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                  <span className="text-mut">
                    {RUBRIC_EMOJI[p.rubric] ?? "📌"} · {CHANNEL_LABELS[p.channel]} · {fmtDateTime(p.scheduled_at)}
                  </span>
                  {p.media_path ? (
                    <span className="text-good">🎞 видео загружено</span>
                  ) : (
                    <span className="text-mut">без видео Higgsfield</span>
                  )}
                </div>
                <Link href={`/posts/${p.id}`} className="font-medium hover:text-accent">
                  {p.title}
                </Link>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-ink2">
                  {p.body_tg.startsWith(p.title) ? p.body_tg.slice(p.title.length).trimStart() : p.body_tg}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PostActions id={p.id} status={p.status} />
                  <Link href={`/posts/${p.id}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-bg">
                    ✏️ Открыть
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
