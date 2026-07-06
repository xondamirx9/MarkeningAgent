"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function generate() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = (await res.json()) as { created: number; usedClaude: boolean };
      setNote(
        `Создано черновиков: ${data.created}${data.usedClaude ? " (тексты — Claude)" : " (тексты — шаблоны)"}`
      );
      router.refresh();
      setTimeout(() => router.push("/queue"), 800);
    } catch {
      setNote("Ошибка генерации");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={generate}
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Агент пишет посты…" : "⚡ Сгенерировать план на неделю"}
      </button>
      {note && <span className="text-sm text-ink2">{note}</span>}
    </div>
  );
}
