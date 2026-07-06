import Link from "next/link";
import { getMetrics, listPosts } from "@/lib/db";
import { fmtNum, fmtDate, RUBRIC_EMOJI } from "@/lib/format";
import { FollowersChart, EngagementChart, ReachChart, type SeriesPoint } from "@/components/Charts";

export const dynamic = "force-dynamic";

function toSeries(rows: ReturnType<typeof getMetrics>, field: "followers" | "reach" | "engagement"): SeriesPoint[] {
  const byDate = new Map<string, SeriesPoint>();
  for (const r of rows) {
    const label = new Date(r.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    const point = byDate.get(r.date) ?? { date: label, telegram: 0, instagram: 0 };
    point[r.channel] = r[field];
    byDate.set(r.date, point);
  }
  return [...byDate.values()];
}

function weeklyEngagement(rows: ReturnType<typeof getMetrics>): SeriesPoint[] {
  const weeks = new Map<string, { date: string; telegram: number; instagram: number }>();
  for (const r of rows) {
    const d = new Date(r.date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const w = weeks.get(key) ?? {
      date: monday.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      telegram: 0,
      instagram: 0,
    };
    w[r.channel] += r.engagement;
    weeks.set(key, w);
  }
  return [...weeks.values()];
}

export default function AnalyticsPage() {
  const metrics = getMetrics(90);
  const followers = toSeries(metrics, "followers");
  const reach = toSeries(metrics, "reach").slice(-30);
  const weekly = weeklyEngagement(metrics);

  const tg = metrics.filter((m) => m.channel === "telegram");
  const ig = metrics.filter((m) => m.channel === "instagram");
  const sum = (rows: typeof tg, f: "reach" | "engagement") => rows.slice(-30).reduce((s, r) => s + r[f], 0);
  const channels = [
    { name: "Telegram", colorVar: "var(--s1)", followers: tg.at(-1)?.followers ?? 0, growth: (tg.at(-1)?.followers ?? 0) - (tg.at(-31)?.followers ?? 0), reach: sum(tg, "reach"), eng: sum(tg, "engagement") },
    { name: "Instagram", colorVar: "var(--s2)", followers: ig.at(-1)?.followers ?? 0, growth: (ig.at(-1)?.followers ?? 0) - (ig.at(-31)?.followers ?? 0), reach: sum(ig, "reach"), eng: sum(ig, "engagement") },
  ];

  const best = listPosts("published").sort((a, b) => b.views - a.views).slice(0, 8);

  const rubricStats = new Map<string, { views: number; n: number }>();
  for (const p of listPosts("published")) {
    const r = rubricStats.get(p.rubric) ?? { views: 0, n: 0 };
    r.views += p.views;
    r.n++;
    rubricStats.set(p.rubric, r);
  }
  const rubricRows = [...rubricStats.entries()]
    .map(([rubric, s]) => ({ rubric, avg: Math.round(s.views / s.n), n: s.n }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Аналитика</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {channels.map((c) => (
          <div key={c.name} className="rounded-2xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.colorVar }} />
              <h2 className="font-medium">{c.name}</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-mut">Подписчики</div>
                <div className="text-lg font-semibold">{fmtNum(c.followers)}</div>
                <div className={c.growth >= 0 ? "text-good" : "text-crit"}>
                  {c.growth >= 0 ? "+" : ""}{fmtNum(c.growth)} / 30 дней
                </div>
              </div>
              <div>
                <div className="text-mut">Охват, 30 дней</div>
                <div className="text-lg font-semibold">{fmtNum(c.reach)}</div>
              </div>
              <div>
                <div className="text-mut">Вовлечения, 30 дней</div>
                <div className="text-lg font-semibold">{fmtNum(c.eng)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-2 font-medium">Рост подписчиков, 90 дней</h2>
        <FollowersChart data={followers} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-2 font-medium">Вовлечённость по неделям</h2>
          <EngagementChart data={weekly} />
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-2 font-medium">Дневной охват, 30 дней</h2>
          <ReachChart data={reach} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-medium">Лучшие посты</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-mut">
                  <th className="pb-2 font-medium">Пост</th>
                  <th className="pb-2 font-medium">Дата</th>
                  <th className="pb-2 text-right font-medium">Просмотры</th>
                  <th className="pb-2 text-right font-medium">ER</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {best.map((p) => (
                  <tr key={p.id}>
                    <td className="max-w-64 py-2 pr-3">
                      <Link href={`/posts/${p.id}`} className="line-clamp-1 hover:text-accent">
                        {RUBRIC_EMOJI[p.rubric]} {p.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-mut">{fmtDate(p.published_at)}</td>
                    <td className="py-2 text-right">{fmtNum(p.views)}</td>
                    <td className="py-2 text-right">
                      {p.views > 0 ? (((p.likes + p.comments + p.shares) / p.views) * 100).toFixed(1) : "0"}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-medium">Что работает: рубрики по средним просмотрам</h2>
          <ul className="space-y-3">
            {rubricRows.map((r) => {
              const max = rubricRows[0]?.avg ?? 1;
              return (
                <li key={r.rubric}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{RUBRIC_EMOJI[r.rubric] ?? "📌"} {r.rubric} <span className="text-mut">· {r.n} пост(ов)</span></span>
                    <span className="font-medium">{fmtNum(r.avg)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full" style={{ width: `${(r.avg / max) * 100}%`, background: "var(--s1)" }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-mut">
            💡 Рекомендация агента: увеличьте долю рубрики-лидера в настройках — план на следующую неделю учтёт вес автоматически.
          </p>
        </div>
      </div>
    </div>
  );
}
