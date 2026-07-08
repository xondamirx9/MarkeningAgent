export type PostStatus = "draft" | "approved" | "scheduled" | "published" | "rejected";
export type Channel = "telegram" | "instagram" | "both";
export type CoverFormat = "reels" | "ig_post" | "tg_post";

export interface Post {
  id: number;
  status: PostStatus;
  channel: Channel;
  rubric: string;
  title: string;
  /** короткий заголовок для обложки; пустой — берётся title */
  cover_title: string;
  destination: string;
  price: string;
  badge: string;
  body_tg: string;
  body_ig: string;
  hashtags: string;
  higgsfield_prompt: string;
  cover_format: CoverFormat;
  media_path: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface MetricRow {
  date: string;
  channel: "telegram" | "instagram";
  followers: number;
  reach: number;
  engagement: number;
}

export interface Offer {
  id: number;
  destination: string;
  price: string;
  /** детали реального тура: даты, отель, что включено */
  details: string;
  hot: number; // 1 = горящий
  active: number; // 1 = участвует в контент-плане
  created_at: string;
}

export interface Competitor {
  id: number;
  name: string;
  city: string;
  tg_url: string;
  ig_url: string;
  tg_subs: number;
  ig_followers: number;
  posts_per_week: number;
  avg_views: number;
  er: number;
  best_format: string;
  strengths: string;
  weaknesses: string;
}

export interface Rubric {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
  share: number; // relative weight in the content plan
}

export interface Settings {
  business: {
    name: string;
    city: string;
    country: string;
    avgCheck: string;
    destinations: string[];
    usp: string;
    tone: string;
  };
  brand: {
    primary: string;
    accent: string;
    textOnDark: string;
  };
  posting: {
    postsPerWeek: number;
    days: number[]; // 0 = Sunday … 6 = Saturday
    timeTelegram: string; // "HH:MM"
    timeInstagram: string;
    autopublish: boolean;
  };
  rubrics: Rubric[];
}
