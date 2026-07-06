import Link from "next/link";
import { listPosts } from "@/lib/db";
import { RUBRIC_EMOJI } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const DOT: Record<string, string> = {
  draft: "bg-warn",
  approved: "bg-accent",
  scheduled: "bg-accent",
  published: "bg-good",
  rejected: "bg-crit",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const now = new Date();
  const [year, month] = m
    ? m.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7; // Monday-first grid

  const posts = listPosts().filter((p) => {
    const iso = p.scheduled_at ?? p.published_at;
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() === month - 1;
  });

  const byDay = new Map<number, typeof posts>();
  for (const p of posts) {
    const d = new Date((p.scheduled_at ?? p.published_at)!).getDate();
    byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${month - 1}`;
  const next = month === 12 ? `${year + 1}-1` : `${year}-${month + 1}`;
  const isToday = (d: number) =>
    now.getFullYear() === year && now.getMonth() === month - 1 && now.getDate() === d;

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Контент-календарь</h1>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?m=${prev}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-card">←</Link>
          <span className="min-w-36 text-center font-medium">{MONTHS[month - 1]} {year}</span>
          <Link href={`/calendar?m=${next}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-card">→</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-ink2">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-warn" />черновик</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />запланирован</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-good" />опубликован</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-crit" />отклонён</span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 gap-px overflow-hidden rounded-2xl border bg-line">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-card px-2 py-2 text-center text-xs font-medium text-ink2">{d}</div>
          ))}
          {cells.map((day, i) => (
            <div key={i} className={`min-h-28 bg-card p-1.5 ${day === null ? "opacity-40" : ""}`}>
              {day !== null && (
                <>
                  <div
                    className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday(day) ? "bg-accent font-semibold text-white" : "text-ink2"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {(byDay.get(day) ?? []).slice(0, 3).map((p) => (
                      <Link
                        key={p.id}
                        href={`/posts/${p.id}`}
                        title={p.title}
                        className="flex items-center gap-1 rounded-md bg-bg px-1.5 py-1 text-[11px] leading-tight hover:ring-1 hover:ring-accent"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[p.status]}`} />
                        <span className="truncate">
                          {RUBRIC_EMOJI[p.rubric] ?? ""} {p.title}
                        </span>
                      </Link>
                    ))}
                    {(byDay.get(day)?.length ?? 0) > 3 && (
                      <div className="px-1.5 text-[11px] text-mut">+{byDay.get(day)!.length - 3} ещё</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
