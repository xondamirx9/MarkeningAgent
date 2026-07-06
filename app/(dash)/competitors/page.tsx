import { listCompetitors } from "@/lib/db";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function CompetitorsPage() {
  const comps = listCompetitors();
  const avgEr = comps.reduce((s, c) => s + c.er, 0) / Math.max(1, comps.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Конкуренты</h1>
        <p className="text-sm text-ink2">
          {comps.length} игроков в мониторинге · средний ER рынка {avgEr.toFixed(1)}%.
          Данные вносятся вручную или через Telethon-парсер (см. README).
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-mut">
              <th className="px-4 py-3 font-medium">Агентство</th>
              <th className="px-4 py-3 font-medium">Город</th>
              <th className="px-4 py-3 text-right font-medium">TG подписчики</th>
              <th className="px-4 py-3 text-right font-medium">IG подписчики</th>
              <th className="px-4 py-3 text-right font-medium">Постов/нед</th>
              <th className="px-4 py-3 text-right font-medium">Ср. просмотры</th>
              <th className="px-4 py-3 text-right font-medium">ER</th>
              <th className="px-4 py-3 font-medium">Что заходит</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comps.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="mt-0.5 flex gap-2 text-xs">
                    <a href={c.tg_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">TG</a>
                    <a href={c.ig_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">IG</a>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink2">{c.city}</td>
                <td className="px-4 py-3 text-right">{fmtNum(c.tg_subs)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(c.ig_followers)}</td>
                <td className="px-4 py-3 text-right">{c.posts_per_week}</td>
                <td className="px-4 py-3 text-right">{fmtNum(c.avg_views)}</td>
                <td className={`px-4 py-3 text-right font-medium ${c.er >= avgEr ? "text-good" : ""}`}>
                  {c.er.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-ink2">{c.best_format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-medium">Сильные стороны конкурентов</h2>
          <ul className="space-y-2 text-sm text-ink2">
            {comps.slice(0, 6).map((c) => (
              <li key={c.id}>
                <span className="font-medium text-ink">{c.name}:</span> {c.strengths}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-medium">Свободные ниши — как отстроиться</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-ink2">
            <li>Единый узнаваемый стиль обложек — почти ни у кого нет (см. «Шаблоны»).</li>
            <li>Гарантия «тур за 24 часа» — никто не обещает срок сборки тура.</li>
            <li>Честные обзоры отелей с минусами — конкуренты пишут только плюсы.</li>
            <li>Telegram-кнопки бронирования под каждым постом.</li>
            <li>Регулярное «закулисье»: живое агентство вызывает больше доверия.</li>
            <li>Ответы в комментариях в течение 15 минут в рабочее время.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
