"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/types";

const field =
  "w-full rounded-lg border bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

export function SettingsForm({
  initial,
  integrations,
}: {
  initial: Settings;
  integrations: { telegram: boolean; anthropic: boolean; higgsfield: boolean };
}) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function patch(part: Partial<Settings>) {
    setS((prev) => ({ ...prev, ...part }));
    setState("idle");
  }

  async function save() {
    setState("saving");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(s),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) router.refresh();
  }

  const card = "rounded-2xl border bg-card p-5 space-y-4";

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="font-medium">Бизнес</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-ink2">Название агентства</label>
            <input className={field} value={s.business.name}
              onChange={(e) => patch({ business: { ...s.business, name: e.target.value } })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-ink2">Город</label>
              <input className={field} value={s.business.city}
                onChange={(e) => patch({ business: { ...s.business, city: e.target.value } })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink2">Средний чек</label>
              <input className={field} value={s.business.avgCheck}
                onChange={(e) => patch({ business: { ...s.business, avgCheck: e.target.value } })} />
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Направления (через запятую)</label>
          <input className={field} value={s.business.destinations.join(", ")}
            onChange={(e) =>
              patch({ business: { ...s.business, destinations: e.target.value.split(",").map((d) => d.trim()).filter(Boolean) } })
            } />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">УТП</label>
          <input className={field} value={s.business.usp}
            onChange={(e) => patch({ business: { ...s.business, usp: e.target.value } })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Тон бренда (инструкция для агента)</label>
          <textarea rows={2} className={field} value={s.business.tone}
            onChange={(e) => patch({ business: { ...s.business, tone: e.target.value } })} />
        </div>
      </section>

      <section className={card}>
        <h2 className="font-medium">Бренд-стиль</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="mb-1 block text-xs text-ink2">Основной цвет</label>
            <div className="flex items-center gap-2">
              <input type="color" value={s.brand.primary} className="h-9 w-14 cursor-pointer rounded border bg-bg"
                onChange={(e) => patch({ brand: { ...s.brand, primary: e.target.value } })} />
              <code className="text-sm text-ink2">{s.brand.primary}</code>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink2">Акцентный цвет (бейджи)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={s.brand.accent} className="h-9 w-14 cursor-pointer rounded border bg-bg"
                onChange={(e) => patch({ brand: { ...s.brand, accent: e.target.value } })} />
              <code className="text-sm text-ink2">{s.brand.accent}</code>
            </div>
          </div>
          <p className="self-end text-xs text-mut">Цвета применяются ко всем обложкам — проверьте на странице «Шаблоны».</p>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-medium">Постинг</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-ink2">Постов в неделю</label>
            <input type="number" min={1} max={14} className={field} value={s.posting.postsPerWeek}
              onChange={(e) => patch({ posting: { ...s.posting, postsPerWeek: Math.max(1, Number(e.target.value) || 1) } })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink2">Время Telegram</label>
            <input type="time" className={field} value={s.posting.timeTelegram}
              onChange={(e) => patch({ posting: { ...s.posting, timeTelegram: e.target.value } })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink2">Время Instagram</label>
            <input type="time" className={field} value={s.posting.timeInstagram}
              onChange={(e) => patch({ posting: { ...s.posting, timeInstagram: e.target.value } })} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Дни публикаций</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const v = DAY_VALUES[i];
              const on = s.posting.days.includes(v);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    patch({
                      posting: {
                        ...s.posting,
                        days: on ? s.posting.days.filter((x) => x !== v) : [...s.posting.days, v],
                      },
                    })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    on ? "border-accent bg-accent/10 font-medium text-accent" : "text-ink2 hover:bg-bg"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={s.posting.autopublish}
            onChange={(e) => patch({ posting: { ...s.posting, autopublish: e.target.checked } })}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-sm">
            Автопубликация одобренных постов по расписанию
            <span className="block text-xs text-mut">Нужен настроенный cron на /api/cron — см. README. Без галочки всё публикуется только вручную.</span>
          </span>
        </label>
      </section>

      <section className={card}>
        <h2 className="font-medium">Рубрики контент-плана</h2>
        <div className="space-y-2">
          {s.rubrics.map((r, i) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
              <label className="flex min-w-52 flex-1 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  className="h-4 w-4 accent-[var(--accent)]"
                  onChange={(e) => {
                    const rubrics = [...s.rubrics];
                    rubrics[i] = { ...r, enabled: e.target.checked };
                    patch({ rubrics });
                  }}
                />
                {r.emoji} {r.name}
              </label>
              <label className="flex items-center gap-2 text-xs text-ink2">
                Вес в плане
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={r.share}
                  className="w-16 rounded-lg border bg-bg px-2 py-1 text-sm"
                  onChange={(e) => {
                    const rubrics = [...s.rubrics];
                    rubrics[i] = { ...r, share: Math.max(1, Number(e.target.value) || 1) };
                    patch({ rubrics });
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="font-medium">Интеграции</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${integrations.telegram ? "bg-good" : "bg-crit"}`} />
            Telegram Bot API — {integrations.telegram ? "настроен" : "не настроен"}
            <span className="text-xs text-mut">(TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID в .env)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${integrations.anthropic ? "bg-good" : "bg-warn"}`} />
            Claude API (тексты постов) — {integrations.anthropic ? "настроен" : "не настроен, используются шаблоны"}
            <span className="text-xs text-mut">(ANTHROPIC_API_KEY в .env)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warn" />
            Instagram Graph API — публикация вручную
            <span className="text-xs text-mut">(нужен Business-аккаунт; инструкция в README)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${integrations.higgsfield ? "bg-good" : "bg-warn"}`} />
            Higgsfield API (генерация фото) — {integrations.higgsfield ? "настроен: кнопка «Сгенерировать фото» на странице поста" : "не настроен: промпт готовится, медиа загружается вручную"}
            <span className="text-xs text-mut">(HF_CREDENTIALS в .env, ключи — cloud.higgsfield.ai)</span>
          </li>
        </ul>
      </section>

      <div className="sticky bottom-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
        >
          {state === "saving" ? "Сохраняем…" : "Сохранить настройки"}
        </button>
        {state === "saved" && <span className="text-sm text-good">Сохранено ✓</span>}
        {state === "error" && <span className="text-sm text-crit">Ошибка сохранения</span>}
      </div>
    </div>
  );
}
