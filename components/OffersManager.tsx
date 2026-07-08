"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Offer } from "@/lib/types";

const field =
  "w-full rounded-lg border bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";

export function OffersManager({ initial }: { initial: Offer[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ destination: "", price: "", details: "", hot: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Ошибка");
      return;
    }
    setForm({ destination: "", price: "", details: "", hot: false });
    router.refresh();
  }

  async function patch(id: number, body: Partial<Offer>) {
    await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Удалить тур из каталога?")) return;
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="font-medium">Добавить тур</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-ink2">Направление *</label>
            <input className={field} value={form.destination} placeholder="Дубай"
              onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink2">Цена</label>
            <input className={field} value={form.price} placeholder="от 620 $"
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={form.hot} className="h-4 w-4 accent-[var(--accent)]"
              onChange={(e) => setForm({ ...form, hot: e.target.checked })} />
            🔥 Горящий тур
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">
            Детали (агент вставит их в текст: даты, отель, что включено)
          </label>
          <input className={field} value={form.details}
            placeholder="Вылет 15 июля, 7 ночей, Rixos 5★ всё включено, прямой рейс"
            onChange={(e) => setForm({ ...form, details: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <button disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {busy ? "Добавляем…" : "+ Добавить тур"}
          </button>
          {error && <span className="text-sm text-crit">{error}</span>}
        </div>
      </form>

      {initial.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-ink2">
          Каталог пуст — план генерируется по направлениям из «Настроек» с ориентировочными ценами.
          Добавьте реальные туры, и агент будет писать посты именно о них.
        </div>
      ) : (
        <div className="space-y-3">
          {initial.map((o) => (
            <div key={o.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 ${o.active ? "" : "opacity-50"}`}>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {o.hot ? "🔥 " : ""}{o.destination} <span className="text-ink2">{o.price}</span>
                </div>
                {o.details && <div className="mt-0.5 text-sm text-ink2">{o.details}</div>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => patch(o.id, { hot: o.hot ? 0 : 1 })}
                  className="rounded-lg border px-3 py-1.5 hover:bg-bg" title="Горящий/обычный">
                  {o.hot ? "🔥 Горящий" : "Обычный"}
                </button>
                <button onClick={() => patch(o.id, { active: o.active ? 0 : 1 })}
                  className="rounded-lg border px-3 py-1.5 hover:bg-bg">
                  {o.active ? "В плане ✓" : "Выключен"}
                </button>
                <button onClick={() => remove(o.id)} className="rounded-lg border px-3 py-1.5 text-mut hover:bg-bg">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
