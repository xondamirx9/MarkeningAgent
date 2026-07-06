"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/types";

const field =
  "w-full rounded-lg border bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";

const HF_STAGE_LABELS: Record<string, string> = {
  image: "1/2: генерируем фото…",
  download: "2/2: сохраняем…",
};

export function PostEditor({ post, hfEnabled }: { post: Post; hfEnabled: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: post.title,
    destination: post.destination,
    price: post.price,
    badge: post.badge,
    channel: post.channel,
    cover_format: post.cover_format,
    body_tg: post.body_tg,
    body_ig: post.body_ig,
    hashtags: post.hashtags,
    higgsfield_prompt: post.higgsfield_prompt,
    scheduled_at: post.scheduled_at ? post.scheduled_at.slice(0, 16) : "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = useState(false);
  const [hfState, setHfState] = useState<{ running: boolean; label: string; error: string }>({
    running: false,
    label: "",
    error: "",
  });

  async function generateVideo() {
    setHfState({ running: true, label: "Запускаем…", error: "" });
    const res = await fetch(`/api/posts/${post.id}/higgsfield`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setHfState({ running: false, label: "", error: data.error ?? "Ошибка запуска" });
      return;
    }
    const poll = setInterval(async () => {
      const r = await fetch(`/api/posts/${post.id}/higgsfield`);
      if (!r.ok) return;
      const data = (await r.json()) as { job: { stage: string; error?: string } | null };
      const stage = data.job?.stage;
      if (stage === "done") {
        clearInterval(poll);
        setHfState({ running: false, label: "", error: "" });
        router.refresh();
      } else if (stage === "error") {
        clearInterval(poll);
        setHfState({ running: false, label: "", error: data.job?.error ?? "Ошибка генерации" });
      } else if (stage) {
        setHfState({ running: true, label: HF_STAGE_LABELS[stage] ?? stage, error: "" });
      }
    }, 3000);
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setState("idle");
  }

  async function save() {
    setState("saving");
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      }),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) router.refresh();
  }

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/posts/${post.id}/media`, { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) router.refresh();
    else alert("Не удалось загрузить файл");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ink2">Заголовок (хук)</label>
          <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-ink2">Направление</label>
            <input className={field} value={form.destination} onChange={(e) => set("destination", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink2">Цена</label>
            <input className={field} value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs text-ink2">Бейдж</label>
            <input className={field} value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Горящий тур" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink2">Каналы</label>
            <select className={field} value={form.channel} onChange={(e) => set("channel", e.target.value as Post["channel"])}>
              <option value="both">TG + IG</option>
              <option value="telegram">Telegram</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink2">Формат обложки</label>
            <select className={field} value={form.cover_format} onChange={(e) => set("cover_format", e.target.value as Post["cover_format"])}>
              <option value="reels">Reels 1080×1920</option>
              <option value="ig_post">IG 1080×1350</option>
              <option value="tg_post">TG 1280×720</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Дата и время публикации</label>
          <input
            type="datetime-local"
            className={field}
            value={form.scheduled_at}
            onChange={(e) => set("scheduled_at", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ink2">Текст для Telegram</label>
          <textarea rows={9} className={field} value={form.body_tg} onChange={(e) => set("body_tg", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink2">Текст для Instagram</label>
          <textarea rows={9} className={field} value={form.body_ig} onChange={(e) => set("body_ig", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink2">Хэштеги</label>
        <input className={field} value={form.hashtags} onChange={(e) => set("hashtags", e.target.value)} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink2">
          Промпт для Higgsfield (скопируйте в Higgsfield, затем загрузите готовое видео ниже)
        </label>
        <textarea rows={4} className={field} value={form.higgsfield_prompt} onChange={(e) => set("higgsfield_prompt", e.target.value)} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {hfEnabled && (
            <button
              type="button"
              onClick={generateVideo}
              disabled={hfState.running}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {hfState.running ? `⏳ ${hfState.label}` : "🖼 Сгенерировать фото (Higgsfield)"}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(form.higgsfield_prompt)}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-bg"
          >
            📋 Скопировать промпт
          </button>
          <label className="cursor-pointer rounded-lg border px-3 py-1.5 text-sm hover:bg-bg">
            {uploading ? "Загружаем…" : "⬆️ Загрузить видео/фото из Higgsfield"}
            <input
              type="file"
              accept="video/mp4,video/webm,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {post.media_path && <span className="text-sm text-good">🎞 {post.media_path}</span>}
          {hfState.error && <span className="text-sm text-crit">{hfState.error}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t pt-4">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {state === "saving" ? "Сохраняем…" : "Сохранить изменения"}
        </button>
        {state === "saved" && <span className="text-sm text-good">Сохранено ✓</span>}
        {state === "error" && <span className="text-sm text-crit">Ошибка сохранения</span>}
      </div>
    </div>
  );
}
