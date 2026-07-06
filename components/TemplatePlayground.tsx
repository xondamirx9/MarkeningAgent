"use client";

import { useState } from "react";
import { Cover, FORMAT_LABELS } from "@/components/Cover";
import type { CoverFormat, Settings } from "@/lib/types";

const field =
  "w-full rounded-lg border bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";

export function TemplatePlayground({ settings }: { settings: Settings }) {
  const [vars, setVars] = useState({
    title: "Горящий тур: вылет уже в субботу",
    destination: settings.business.destinations[0] ?? "Дубай",
    price: "от 620 $",
    badge: "Горящий тур",
  });

  const formats: CoverFormat[] = ["reels", "ig_post", "tg_post"];

  return (
    <div className="space-y-6">
      <div className="grid max-w-3xl grid-cols-1 gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ink2">Заголовок</label>
          <input className={field} value={vars.title} onChange={(e) => setVars({ ...vars, title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Направление</label>
          <input className={field} value={vars.destination} onChange={(e) => setVars({ ...vars, destination: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Цена</label>
          <input className={field} value={vars.price} onChange={(e) => setVars({ ...vars, price: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Бейдж (пусто — скрыть)</label>
          <input className={field} value={vars.badge} onChange={(e) => setVars({ ...vars, badge: e.target.value })} />
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {formats.map((f) => (
          <figure key={f} className="space-y-2">
            <Cover
              format={f}
              title={vars.title}
              destination={vars.destination}
              price={vars.price}
              badge={vars.badge}
              brandName={settings.business.name}
              primary={settings.brand.primary}
              accent={settings.brand.accent}
              width={f === "tg_post" ? 380 : 240}
            />
            <figcaption className="text-xs text-mut">{FORMAT_LABELS[f]}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
