"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PostActions({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function act(action: string) {
    setBusy(action);
    setError("");
    const res = await fetch(`/api/posts/${id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy("");
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Ошибка");
      return;
    }
    router.refresh();
  }

  const btn = "rounded-lg border px-3 py-1.5 text-sm hover:bg-bg disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(status === "draft" || status === "rejected") && (
        <button className={`${btn} border-good/40 text-good`} disabled={!!busy} onClick={() => act("approve")}>
          {busy === "approve" ? "…" : "✓ Одобрить"}
        </button>
      )}
      {status === "draft" && (
        <button className={`${btn} border-crit/40 text-crit`} disabled={!!busy} onClick={() => act("reject")}>
          {busy === "reject" ? "…" : "✕ Отклонить"}
        </button>
      )}
      {(status === "scheduled" || status === "approved") && (
        <button className={btn} disabled={!!busy} onClick={() => act("publish")}>
          {busy === "publish" ? "Публикуем…" : "🚀 Опубликовать сейчас"}
        </button>
      )}
      {status !== "published" && (
        <button
          className={`${btn} text-mut`}
          disabled={!!busy}
          onClick={() => {
            if (confirm("Удалить пост безвозвратно?")) act("delete");
          }}
        >
          {busy === "delete" ? "…" : "Удалить"}
        </button>
      )}
      {error && <span className="text-sm text-crit">{error}</span>}
    </div>
  );
}
