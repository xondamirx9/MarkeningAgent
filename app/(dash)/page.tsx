import Link from "next/link";
import { getMetrics, listPosts, getSettings } from "@/lib/db";
import { fmtNum, fmtDateTime, RUBRIC_EMOJI, CHANNEL_LABELS } from "@/lib/format";
import { GenerateButton } from "@/components/GenerateButton";
import { Sparkline } from "@/components/Charts";

export const dynamic = "force-dynamic";

export default function Overview() {
  const metrics = getMetrics(30);
  const posts = listPosts();
  const settings = getSettings();

  const tg = metrics.filter((m) => m.channel === "telegram");
  const ig = metrics.filter((m) => m.channel === "instagram");
  const tgNow = tg.at(-1)?.followers ?? 0;
  const igNow = ig.at(-1)?.followers ?? 0;
  const tgDelta = tgNow - (tg.at(-8)?.followers ?? tgNow);
  const igDelta = igNow - (ig.at(-8)?.followers ?? igNow);

  const published = posts.filter((p) => p.status === "published");
  const totalViews = published.reduce((s, p) => s + p.views, 0);
  const totalEng = published.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
  const er = totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(1) : "0";

  const drafts = posts.filter((p) => p.status === "draft");
  const upcoming = posts
    .filter((p) => (p.status === "scheduled" || p.status === "approved") && p.scheduled_at)
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1))
    .slice(0, 5);

  const tiles = [
    { label: "Подписчики Telegram", value: fmtNum(tgNow), delta: tgDelta, spark: tg.map((m) => ({ v: m.followers })), color: "s1" as const },
    { label: "Подписчики Instagram", value: fmtNum(igNow), delta: igDelta, spark: ig.map((m) => ({ v: m.followers })), color: "s2" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Обзор</h1>
          <p className="text-sm text-ink2">
            {settings.business.name} · {settings.business.city}
          </p>
        </div>
        <GenerateButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border bg-card p-4">
            <div className="text-sm text-ink2">{t.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{t.value}</span>
              <span className={`text-sm ${t.delta >= 0 ? "text-good" : "text-crit"}`}>
                {t.delta >= 0 ? "+" : ""}
                {fmtNum(t.delta)} за 7 дней
              </span>
            </div>
            <Sparkline data={t.spark} color={t.color} />
          </div>
        ))}
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-ink2">Вовлечённость (ER)</div>
          <div className="mt-1 text-2xl font-semibold">{er}%</div>
          <p className="mt-2 text-xs text-mut">реакции + комментарии + репосты к просмотрам, опубликованные посты</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm text-ink2">Ждут модерации</div>
          <div className="mt-1 text-2xl font-semibold">{drafts.length}</div>
          <Link href="/queue" className="mt-2 inline-block text-sm text-accent hover:underline">
            Перейти к очереди →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Ближайшие публикации</h2>
            <Link href="/calendar" className="text-sm text-accent hover:underline">Календарь →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink2">Нет запланированных постов — сгенерируйте план на неделю.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link href={`/posts/${p.id}`} className="group flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm group-hover:text-accent">
                      {RUBRIC_EMOJI[p.rubric] ?? "📌"} {p.title}
                    </span>
                    <span className="shrink-0 text-xs text-mut">
                      {CHANNEL_LABELS[p.channel]} · {fmtDateTime(p.scheduled_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Лучшие посты за месяц</h2>
            <Link href="/analytics" className="text-sm text-accent hover:underline">Аналитика →</Link>
          </div>
          <ul className="divide-y">
            {published
              .sort((a, b) => b.views - a.views)
              .slice(0, 5)
              .map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link href={`/posts/${p.id}`} className="group flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm group-hover:text-accent">
                      {RUBRIC_EMOJI[p.rubric] ?? "📌"} {p.title}
                    </span>
                    <span className="shrink-0 text-xs text-mut">👁 {fmtNum(p.views)} · ❤️ {fmtNum(p.likes)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
