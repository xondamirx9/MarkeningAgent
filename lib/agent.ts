import Anthropic from "@anthropic-ai/sdk";
import { getSettings, insertPost, listPosts } from "./db";
import type { Rubric, Settings } from "./types";

const PRICES: Record<string, string> = {
  Дубай: "от 620 $",
  Стамбул: "от 380 $",
  Анталья: "от 450 $",
  "Шарм-эль-Шейх": "от 520 $",
  Пхукет: "от 780 $",
  Мальдивы: "от 1 250 $",
};

interface Slot {
  date: Date;
  rubric: Rubric;
  destination: string;
  price: string;
}

interface GeneratedTexts {
  title: string;
  body_tg: string;
  body_ig: string;
  hashtags: string;
}

// Rubric rotation weighted by `share`, destination rotation offset by
// recently used destinations so the plan doesn't repeat last week's.
function buildSlots(s: Settings): Slot[] {
  const enabled = s.rubrics.filter((r) => r.enabled);
  if (enabled.length === 0) return [];

  const pool: Rubric[] = [];
  for (const r of enabled) for (let i = 0; i < Math.max(1, r.share); i++) pool.push(r);

  const recent = new Set(
    listPosts().slice(0, 10).map((p) => p.destination).filter(Boolean)
  );
  const dests = s.business.destinations.length > 0 ? s.business.destinations : ["Дубай"];
  const ordered = [...dests.filter((d) => !recent.has(d)), ...dests.filter((d) => recent.has(d))];

  const slots: Slot[] = [];
  const now = new Date();
  let produced = 0;
  for (let offset = 1; offset <= 7 && produced < s.posting.postsPerWeek; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!s.posting.days.includes(d.getDay())) continue;
    const [h, m] = (s.posting.timeTelegram || "12:00").split(":").map(Number);
    d.setHours(h || 12, m || 0, 0, 0);
    slots.push({
      date: d,
      rubric: pool[produced % pool.length],
      destination: ordered[produced % ordered.length],
      price: PRICES[ordered[produced % ordered.length]] ?? `${s.business.avgCheck}`,
    });
    produced++;
  }
  // If enabled days are too few for the requested volume, fill remaining days
  for (let offset = 1; offset <= 7 && slots.length < s.posting.postsPerWeek; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (slots.some((sl) => sl.date.toDateString() === d.toDateString())) continue;
    const [h, m] = (s.posting.timeTelegram || "12:00").split(":").map(Number);
    d.setHours(h || 12, m || 0, 0, 0);
    const i = slots.length;
    slots.push({
      date: d,
      rubric: pool[i % pool.length],
      destination: ordered[i % ordered.length],
      price: PRICES[ordered[i % ordered.length]] ?? `${s.business.avgCheck}`,
    });
  }
  slots.sort((a, b) => a.date.getTime() - b.date.getTime());
  return slots;
}

function higgsfieldPrompt(slot: Slot, s: Settings): string {
  const mood = slot.rubric.id === "hot" || slot.rubric.id === "promo"
    ? "energetic pacing, quick cuts, dynamic camera push-in"
    : "calm pacing, long takes, gentle camera drift";
  return (
    `Cinematic vertical travel reel (9:16), ${slot.destination}. ` +
    `Golden-hour establishing aerial shot, then slow dolly toward a traveler at an iconic viewpoint. ` +
    `Warm sunlight, teal-and-amber color grade, shallow depth of field, 4k, ${mood}. ` +
    `Brand style of ${s.business.name}: clean composition, negative space in the bottom third reserved for a branded caption overlay (${s.brand.primary} / ${s.brand.accent}). No on-screen text.`
  );
}

// --- Template fallback (works without an API key) ---

const HOOKS: Record<string, (d: string, p: string) => string> = {
  hot: (d, p) => `🔥 ${d} ${p} — такие цены живут один день`,
  guide: (d) => `🌍 ${d}: маршрут, после которого не захочется домой`,
  review: (d) => `⭐ «Лучший отпуск за пять лет» — честный отзыв о ${d}`,
  backstage: () => `🎬 Как мы собираем тур за 24 часа — показываем изнутри`,
  promo: (d, p) => `🎁 Акция недели: ${d} ${p} для первых пяти броней`,
  trend: (d) => `🎥 Тренд недели: ${d} глазами наших туристов`,
};

function templateTexts(slot: Slot, s: Settings): GeneratedTexts {
  const { destination: d, price: p } = slot;
  const title = HOOKS[slot.rubric.id]?.(d, p) ?? `${slot.rubric.emoji} ${slot.rubric.name}: ${d}`;
  const cta = "👉 Напишите нам в личку — подберём тур под ваш бюджет за 24 часа.";
  const bodyCore =
    slot.rubric.id === "hot"
      ? `✈️ Вылет из ${s.business.city}, в пакете:\n• перелёт туда-обратно\n• отель 4–5★ с завтраками\n• трансфер и страховка\n\n💵 ${p} на человека. Мест мало — горящие туры разбирают за день.`
      : slot.rubric.id === "guide"
        ? `Сохраните пост: когда лететь, сколько закладывать на день, топ-5 мест и где лучшие закаты. Всё проверено нашими туристами.\n\n💵 Туры ${p}.`
        : slot.rubric.id === "review"
          ? `Наши туристы вернулись из ${d} и рассказали, как всё прошло на самом деле: отель, пляж, экскурсии и то, о чём не пишут в буклетах.`
          : slot.rubric.id === "backstage"
            ? `Подбор отеля, выкуп билетов, виза, трансфер — показываем, что происходит за кулисами, пока вы собираете чемодан. ${s.business.usp}.`
            : `Только до воскресенья: ${d} ${p} для первых пяти броней. Дальше цена вернётся к обычной.`;
  const hashtags = `#туры #путешествия #${d.replace(/[-\s]/g, "").toLowerCase()} #${s.business.city.toLowerCase()} #горящиетуры #отпуск`;
  return {
    title,
    body_tg: `${title}\n\n${bodyCore}\n\n${cta}`,
    body_ig: `${title}\n\n${bodyCore.split("\n\n")[0]}\n\n📲 Подробности в директ`,
    hashtags,
  };
}

// --- Claude generation (used when ANTHROPIC_API_KEY is set) ---

const TEXT_SCHEMA = {
  type: "object" as const,
  properties: {
    posts: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          body_tg: { type: "string" as const },
          body_ig: { type: "string" as const },
          hashtags: { type: "string" as const },
        },
        required: ["title", "body_tg", "body_ig", "hashtags"],
        additionalProperties: false,
      },
    },
  },
  required: ["posts"],
  additionalProperties: false,
};

async function claudeTexts(slots: Slot[], s: Settings): Promise<GeneratedTexts[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const brief = slots
      .map(
        (sl, i) =>
          `${i + 1}. Рубрика: ${sl.rubric.name} (${sl.rubric.id}); направление: ${sl.destination}; цена: ${sl.price}; дата: ${sl.date.toLocaleDateString("ru-RU")}`
      )
      .join("\n");
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 16000,
      system:
        `Ты — SMM-копирайтер туристического агентства «${s.business.name}» (${s.business.city}, ${s.business.country}). ` +
        `УТП: ${s.business.usp}. Тон бренда: ${s.business.tone}. ` +
        `Для каждого поста напиши: title (цепляющий хук до 70 символов, с эмодзи), ` +
        `body_tg (полный пост для Telegram: хук, тело с буллетами и эмодзи, конкретная цена, CTA написать в личку), ` +
        `body_ig (короче, для Instagram: хук + 2-3 предложения + CTA в директ, без хэштегов в теле), ` +
        `hashtags (7-10 хэштегов через пробел, на русском, под нишу travel). ` +
        `Пиши по-русски, без канцелярита, цены указывай как в брифе.`,
      messages: [{ role: "user", content: `Напиши посты по брифу:\n${brief}` }],
      output_config: { format: { type: "json_schema", schema: TEXT_SCHEMA } },
    });
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const parsed = JSON.parse(block.text) as { posts: GeneratedTexts[] };
    return parsed.posts.length === slots.length ? parsed.posts : null;
  } catch (err) {
    console.error("[agent] Claude generation failed, falling back to templates:", err);
    return null;
  }
}

export async function generateWeekPlan(): Promise<{ created: number; usedClaude: boolean }> {
  const s = getSettings();
  const slots = buildSlots(s);
  if (slots.length === 0) return { created: 0, usedClaude: false };

  const ai = await claudeTexts(slots, s);
  let created = 0;
  slots.forEach((slot, i) => {
    const texts = ai?.[i] ?? templateTexts(slot, s);
    insertPost({
      status: "draft",
      channel: "both",
      rubric: slot.rubric.id,
      title: texts.title,
      destination: slot.destination,
      price: slot.price,
      badge: slot.rubric.id === "hot" ? "Горящий тур" : slot.rubric.id === "promo" ? "Акция" : "",
      body_tg: texts.body_tg,
      body_ig: texts.body_ig,
      hashtags: texts.hashtags,
      higgsfield_prompt: higgsfieldPrompt(slot, s),
      cover_format: slot.rubric.id === "guide" ? "ig_post" : "reels",
      media_path: null,
      scheduled_at: slot.date.toISOString(),
      published_at: null,
    });
    created++;
  });
  return { created, usedClaude: ai !== null };
}
