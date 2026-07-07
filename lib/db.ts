import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Post, MetricRow, Competitor, Settings } from "./types";
import { seed } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");

function open(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "app.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'draft',
      channel TEXT NOT NULL DEFAULT 'both',
      rubric TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      destination TEXT NOT NULL DEFAULT '',
      price TEXT NOT NULL DEFAULT '',
      badge TEXT NOT NULL DEFAULT '',
      body_tg TEXT NOT NULL DEFAULT '',
      body_ig TEXT NOT NULL DEFAULT '',
      hashtags TEXT NOT NULL DEFAULT '',
      higgsfield_prompt TEXT NOT NULL DEFAULT '',
      cover_format TEXT NOT NULL DEFAULT 'ig_post',
      media_path TEXT,
      scheduled_at TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      shares INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS metrics (
      date TEXT NOT NULL,
      channel TEXT NOT NULL,
      followers INTEGER NOT NULL,
      reach INTEGER NOT NULL,
      engagement INTEGER NOT NULL,
      PRIMARY KEY (date, channel)
    );
    CREATE TABLE IF NOT EXISTS competitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      tg_url TEXT NOT NULL DEFAULT '',
      ig_url TEXT NOT NULL DEFAULT '',
      tg_subs INTEGER NOT NULL DEFAULT 0,
      ig_followers INTEGER NOT NULL DEFAULT 0,
      posts_per_week INTEGER NOT NULL DEFAULT 0,
      avg_views INTEGER NOT NULL DEFAULT 0,
      er REAL NOT NULL DEFAULT 0,
      best_format TEXT NOT NULL DEFAULT '',
      strengths TEXT NOT NULL DEFAULT '',
      weaknesses TEXT NOT NULL DEFAULT ''
    );
  `);
  // миграция: короткий заголовок обложки, отдельный от хука поста
  const cols = db.prepare("PRAGMA table_info(posts)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "cover_title")) {
    db.exec("ALTER TABLE posts ADD COLUMN cover_title TEXT NOT NULL DEFAULT ''");
  }
  const count = (db.prepare("SELECT COUNT(*) AS n FROM posts").get() as { n: number }).n;
  if (count === 0) seed(db);
  return db;
}

// Reuse the connection across dev hot reloads
const g = globalThis as unknown as { __db?: Database.Database };
export const db: Database.Database = g.__db ?? (g.__db = open());

export const DEFAULT_SETTINGS: Settings = {
  business: {
    name: "Sayyoh Travel",
    city: "Ташкент",
    country: "Узбекистан",
    avgCheck: "800 $",
    destinations: ["Дубай", "Стамбул", "Анталья", "Шарм-эль-Шейх", "Пхукет", "Мальдивы"],
    usp: "Туры под ключ за 24 часа: виза, перелёт, отель и трансфер — без скрытых доплат",
    tone: "Дружелюбный эксперт: тепло, конкретно, без канцелярита. Обращение на «вы».",
  },
  brand: {
    primary: "#2a78d6",
    accent: "#eda100",
    textOnDark: "#ffffff",
  },
  posting: {
    postsPerWeek: 5,
    days: [1, 2, 3, 5, 6],
    timeTelegram: "12:30",
    timeInstagram: "19:00",
    autopublish: false,
  },
  rubrics: [
    { id: "hot", name: "Горящие туры", emoji: "🔥", enabled: true, share: 3 },
    { id: "guide", name: "Гайд по направлению", emoji: "🌍", enabled: true, share: 2 },
    { id: "review", name: "Отзывы туристов", emoji: "⭐", enabled: true, share: 1 },
    { id: "backstage", name: "Закулисье агентства", emoji: "🎬", enabled: true, share: 1 },
    { id: "promo", name: "Акции и скидки", emoji: "🎁", enabled: true, share: 1 },
    { id: "trend", name: "Reels-тренды", emoji: "🎥", enabled: false, share: 1 },
  ],
};

export function getSettings(): Settings {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'app'").get() as
    | { value: string }
    | undefined;
  if (!row) return DEFAULT_SETTINGS;
  const saved = JSON.parse(row.value) as Partial<Settings>;
  return {
    business: { ...DEFAULT_SETTINGS.business, ...saved.business },
    brand: { ...DEFAULT_SETTINGS.brand, ...saved.brand },
    posting: { ...DEFAULT_SETTINGS.posting, ...saved.posting },
    rubrics: saved.rubrics ?? DEFAULT_SETTINGS.rubrics,
  };
}

export function saveSettings(s: Settings) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(JSON.stringify(s));
}

export function listPosts(status?: string): Post[] {
  if (status)
    return db
      .prepare("SELECT * FROM posts WHERE status = ? ORDER BY COALESCE(scheduled_at, created_at) DESC")
      .all(status) as Post[];
  return db
    .prepare("SELECT * FROM posts ORDER BY COALESCE(scheduled_at, created_at) DESC")
    .all() as Post[];
}

export function getPost(id: number): Post | undefined {
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as Post | undefined;
}

const POST_FIELDS = [
  "status", "channel", "rubric", "title", "cover_title", "destination", "price", "badge",
  "body_tg", "body_ig", "hashtags", "higgsfield_prompt", "cover_format",
  "media_path", "scheduled_at", "published_at",
] as const;

export function updatePost(id: number, patch: Partial<Post>) {
  const keys = POST_FIELDS.filter((k) => k in patch);
  if (keys.length === 0) return;
  const sql = `UPDATE posts SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`;
  db.prepare(sql).run(...keys.map((k) => patch[k] ?? null), new Date().toISOString(), id);
}

export function insertPost(p: Omit<Post, "id" | "created_at" | "updated_at" | "views" | "likes" | "comments" | "shares">): number {
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO posts (status, channel, rubric, title, cover_title, destination, price, badge, body_tg, body_ig,
        hashtags, higgsfield_prompt, cover_format, media_path, scheduled_at, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      p.status, p.channel, p.rubric, p.title, p.cover_title, p.destination, p.price, p.badge,
      p.body_tg, p.body_ig, p.hashtags, p.higgsfield_prompt, p.cover_format,
      p.media_path, p.scheduled_at, p.published_at, now, now
    );
  return Number(res.lastInsertRowid);
}

export function deletePost(id: number) {
  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
}

export function getMetrics(days = 90): MetricRow[] {
  return db
    .prepare(
      "SELECT * FROM metrics WHERE date >= date('now', ?) ORDER BY date ASC"
    )
    .all(`-${days} days`) as MetricRow[];
}

export function listCompetitors(): Competitor[] {
  return db.prepare("SELECT * FROM competitors ORDER BY tg_subs DESC").all() as Competitor[];
}
