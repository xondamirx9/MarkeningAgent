import type Database from "better-sqlite3";

// Deterministic PRNG so demo data is stable between reseeds
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DESTS: [string, string][] = [
  ["Дубай", "от 620 $"],
  ["Стамбул", "от 380 $"],
  ["Анталья", "от 450 $"],
  ["Шарм-эль-Шейх", "от 520 $"],
  ["Пхукет", "от 780 $"],
  ["Мальдивы", "от 1 250 $"],
];

const RUBRICS = ["hot", "guide", "review", "backstage", "promo"];
const RUBRIC_TITLES: Record<string, (d: string) => string> = {
  hot: (d) => `Горящий тур: ${d}`,
  guide: (d) => `Гайд: что посмотреть в ${d}`,
  review: (d) => `Отзыв: как прошёл отдых в ${d}`,
  backstage: () => `Как мы собираем тур за 24 часа`,
  promo: (d) => `Акция недели: ${d} со скидкой`,
};

export function seed(db: Database.Database) {
  const rnd = mulberry32(20260706);
  const now = new Date();
  const day = 24 * 3600 * 1000;

  // --- 90 days of channel metrics with a growth trend ---
  const insMetric = db.prepare(
    "INSERT OR REPLACE INTO metrics (date, channel, followers, reach, engagement) VALUES (?, ?, ?, ?, ?)"
  );
  let tg = 2140;
  let ig = 3480;
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now.getTime() - i * day);
    const date = d.toISOString().slice(0, 10);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    tg += Math.round(4 + rnd() * 22 + (i < 30 ? 8 : 0)); // growth accelerates in the last month
    ig += Math.round(6 + rnd() * 30 + (i < 30 ? 12 : 0));
    const tgReach = Math.round(tg * (0.32 + rnd() * 0.18) * (weekend ? 0.85 : 1));
    const igReach = Math.round(ig * (0.45 + rnd() * 0.25) * (weekend ? 1.1 : 1));
    insMetric.run(date, "telegram", tg, tgReach, Math.round(tgReach * (0.06 + rnd() * 0.04)));
    insMetric.run(date, "instagram", ig, igReach, Math.round(igReach * (0.05 + rnd() * 0.05)));
  }

  // --- Posts: published history + scheduled + moderation queue ---
  const insPost = db.prepare(
    `INSERT INTO posts (status, channel, rubric, title, destination, price, badge, body_tg, body_ig,
      hashtags, higgsfield_prompt, cover_format, media_path, scheduled_at, published_at, created_at, updated_at,
      views, likes, comments, shares)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const mkBody = (rubric: string, dest: string, price: string) => {
    const tgBody =
      rubric === "hot"
        ? `🔥 Ловите момент — ${dest} по цене, которую мы сами не ожидали!\n\n✈️ Вылет из Ташкента, всё включено:\n• перелёт туда-обратно\n• отель 4–5★ с завтраками\n• трансфер и страховка\n\n💵 ${price} на человека\nМест мало — такие туры разбирают за день.\n\n👉 Пишите «ХОЧУ» в личку или жмите кнопку ниже.`
        : rubric === "guide"
          ? `🌍 Планируете ${dest}? Сохраните этот пост.\n\nСобрали главное: когда лететь, сколько закладывать на день, что посмотреть в первую очередь и где лучшие закаты.\n\n💵 Туры ${price}\n\n👉 Хотите маршрут под себя — напишите нам, соберём за 24 часа.`
          : rubric === "review"
            ? `⭐ «Думали, что за эти деньги будет обычный отель — а получили сказку».\n\nНаши туристы вернулись из ${dest} и поделились впечатлениями. Читайте отзыв целиком в карточках.\n\n👉 Хотите так же? Напишите «ОТДЫХ» — подберём тур под ваш бюджет.`
            : rubric === "backstage"
              ? `🎬 Пока вы спите — мы бронируем.\n\nПоказываем, как за 24 часа собирается тур под ключ: подбор отеля, выкуп авиабилетов, виза и трансфер. Никакой магии — только опыт и проверенные партнёры.\n\n👉 Проверьте нас: напишите даты и бюджет.`
              : `🎁 Акция недели!\n\n${dest} со скидкой для первых пяти броней: ${price} вместо полной цены.\n\nУспейте до воскресенья — дальше цена вернётся.\n\n👉 Пишите «АКЦИЯ» в личку.`;
    const igBody = tgBody.split("\n\n").slice(0, 2).join("\n\n") + "\n\n📲 Подробности в директ";
    return { tgBody, igBody };
  };

  const hashtags = (dest: string) =>
    `#туры #путешествия #${dest.replace(/[-\s]/g, "").toLowerCase()} #горящиетуры #отпуск #ташкент #турагентство`;

  const higgs = (rubric: string, dest: string) =>
    `Cinematic travel reel, ${dest}: golden-hour aerial establishing shot, slow dolly-in to a traveler at a scenic viewpoint, warm sunlight, teal-and-amber grade, gentle camera drift, 4k, upbeat mood. Brand style: clean composition, space at the bottom third for a caption overlay${rubric === "hot" ? ", energetic pacing, quick cuts" : ", calm pacing, long takes"}.`;

  // Published: ~18 posts over the last 40 days
  for (let i = 0; i < 18; i++) {
    const daysAgo = 2 + Math.floor(rnd() * 38);
    const d = new Date(now.getTime() - daysAgo * day);
    const rubric = RUBRICS[Math.floor(rnd() * RUBRICS.length)];
    const [dest, price] = DESTS[Math.floor(rnd() * DESTS.length)];
    const { tgBody, igBody } = mkBody(rubric, dest, price);
    const views = Math.round(700 + rnd() * 2600);
    insPost.run(
      "published", rnd() > 0.3 ? "both" : "telegram", rubric,
      RUBRIC_TITLES[rubric](dest), dest, price,
      rubric === "hot" ? "Горящий тур" : rubric === "promo" ? "Акция" : "",
      tgBody, igBody, hashtags(dest), higgs(rubric, dest),
      rubric === "guide" ? "ig_post" : "reels", null,
      d.toISOString(), d.toISOString(), d.toISOString(), d.toISOString(),
      views, Math.round(views * (0.04 + rnd() * 0.05)),
      Math.round(views * (0.004 + rnd() * 0.01)), Math.round(views * (0.008 + rnd() * 0.02))
    );
  }

  // Scheduled: 4 posts over the next week
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getTime() + (i + 1) * 1.5 * day);
    d.setHours(12, 30, 0, 0);
    const rubric = RUBRICS[i % RUBRICS.length];
    const [dest, price] = DESTS[(i * 2) % DESTS.length];
    const { tgBody, igBody } = mkBody(rubric, dest, price);
    insPost.run(
      "scheduled", "both", rubric, RUBRIC_TITLES[rubric](dest), dest, price,
      rubric === "hot" ? "Горящий тур" : "", tgBody, igBody, hashtags(dest),
      higgs(rubric, dest), "reels", null, d.toISOString(), null,
      now.toISOString(), now.toISOString(), 0, 0, 0, 0
    );
  }

  // Drafts awaiting moderation: 5
  for (let i = 0; i < 5; i++) {
    const d = new Date(now.getTime() + (i + 2) * day);
    d.setHours(19, 0, 0, 0);
    const rubric = RUBRICS[(i + 1) % RUBRICS.length];
    const [dest, price] = DESTS[(i * 3 + 1) % DESTS.length];
    const { tgBody, igBody } = mkBody(rubric, dest, price);
    insPost.run(
      "draft", "both", rubric, RUBRIC_TITLES[rubric](dest), dest, price,
      rubric === "hot" ? "Горящий тур" : rubric === "promo" ? "Акция" : "",
      tgBody, igBody, hashtags(dest), higgs(rubric, dest),
      i % 2 === 0 ? "reels" : "ig_post", null, d.toISOString(), null,
      now.toISOString(), now.toISOString(), 0, 0, 0, 0
    );
  }

  // --- Competitors ---
  const insComp = db.prepare(
    `INSERT INTO competitors (name, city, tg_url, ig_url, tg_subs, ig_followers, posts_per_week, avg_views, er, best_format, strengths, weaknesses)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const comps: [string, string, number, number, number, number, number, string, string, string][] = [
    ["GoTravel Uzbekistan", "Ташкент", 18400, 24100, 9, 4100, 3.1, "Reels с ценами", "Ежедневный постинг, сильные Reels", "Однообразные офферы, слабые тексты"],
    ["SunTour", "Ташкент", 12800, 15600, 6, 2900, 2.4, "Карусели-гайды", "Хорошие гайды по визам", "Редко отвечают в комментариях"],
    ["Anor Travel", "Ташкент", 9600, 21500, 7, 3600, 4.2, "Отзывы клиентов", "Живые отзывы, UGC", "Нет Telegram-стратегии"],
    ["FlyDream", "Самарканд", 7300, 9800, 4, 1500, 1.8, "Фото направлений", "Красивый визуал", "Низкая частота, нет CTA"],
    ["Orient Voyage", "Ташкент", 6900, 13400, 5, 2200, 2.9, "Горящие туры", "Быстрые публикации горящих туров", "Нет единого стиля обложек"],
    ["Silk Road Tours", "Бухара", 5400, 11200, 3, 1900, 3.4, "Истории-закулисье", "Аутентичный контент", "Нерегулярный постинг"],
    ["TezTrip", "Ташкент", 15200, 8700, 10, 2600, 1.6, "Посты с ценами", "Агрессивные цены", "Спамный тон, отписки"],
    ["Marhabo Travel", "Ташкент", 4800, 7600, 4, 1100, 2.1, "Карусели", "Хорошая упаковка акций", "Слабая аналитика хэштегов"],
    ["Almaz Tour", "Фергана", 3900, 6200, 3, 800, 2.7, "Отзывы", "Лояльная аудитория", "Мало видеоконтента"],
    ["Travel Hub Asia", "Алматы", 26700, 31900, 12, 6800, 3.8, "Reels-тренды", "Тренды, коллаборации с блогерами", "Общий контент, мало локальной специфики"],
    ["HotTours KZ", "Алматы", 21300, 18500, 8, 5200, 2.5, "Горящие туры", "Сильный Telegram с кнопками брони", "Instagram ведётся по остаточному принципу"],
    ["Caravan Club", "Ташкент", 8100, 12900, 5, 2400, 3.0, "Гайды по направлениям", "Экспертные разборы отелей", "Обложки без единого стиля"],
  ];
  for (const c of comps) {
    insComp.run(c[0], c[1], `https://t.me/${c[0].toLowerCase().replace(/[^a-z]/g, "")}`,
      `https://instagram.com/${c[0].toLowerCase().replace(/[^a-z]/g, "")}`,
      c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9]);
  }
}
