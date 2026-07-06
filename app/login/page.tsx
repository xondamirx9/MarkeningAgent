"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Неверный логин или пароль");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm"
      >
        <div className="mb-6 text-center">
          <div className="text-3xl">✈️</div>
          <h1 className="mt-2 text-xl font-semibold">Маркетинговый агент</h1>
          <p className="mt-1 text-sm text-ink2">Платформа управления турагентством</p>
        </div>
        <label className="mb-1 block text-sm text-ink2">Логин</label>
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="username"
          className="mb-4 w-full rounded-lg border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="mb-1 block text-sm text-ink2">Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded-lg border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
        />
        {error && <p className="mb-3 text-sm text-crit">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Входим…" : "Войти"}
        </button>
        <p className="mt-4 text-center text-xs text-mut">
          По умолчанию: admin / admin123 (меняется в .env)
        </p>
      </form>
    </main>
  );
}
