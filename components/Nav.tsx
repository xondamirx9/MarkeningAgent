"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Обзор", icon: "📊" },
  { href: "/queue", label: "Модерация", icon: "📝" },
  { href: "/calendar", label: "Календарь", icon: "📅" },
  { href: "/analytics", label: "Аналитика", icon: "📈" },
  { href: "/competitors", label: "Конкуренты", icon: "🔎" },
  { href: "/templates", label: "Шаблоны", icon: "🎨" },
  { href: "/settings", label: "Настройки", icon: "⚙️" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r bg-card md:w-56">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <span className="text-xl">✈️</span>
        <span className="hidden text-sm font-semibold md:block">Маркетинг-агент</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-accent/10 font-medium text-accent" : "text-ink2 hover:bg-bg"
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden md:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="m-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink2 hover:bg-bg"
      >
        <span>🚪</span>
        <span className="hidden md:block">Выйти</span>
      </button>
    </aside>
  );
}
