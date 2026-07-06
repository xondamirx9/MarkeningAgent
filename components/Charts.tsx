"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const TG = "var(--s1)";
const IG = "var(--s2)";

export interface SeriesPoint {
  date: string;
  telegram: number;
  instagram: number;
}

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-ink2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-ink">{new Intl.NumberFormat("ru-RU").format(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const legendStyle = { fontSize: 12, color: "var(--ink2)" };
const axisProps = {
  tickLine: false as const,
  axisLine: { stroke: "var(--grid)" },
};

export function FollowersChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--mut)", strokeDasharray: "3 3" }} />
        <Legend wrapperStyle={legendStyle} />
        <Line type="monotone" dataKey="telegram" name="Telegram" stroke={TG} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="instagram" name="Instagram" stroke={IG} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EngagementChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" {...axisProps} minTickGap={30} />
        <YAxis {...axisProps} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--grid)", opacity: 0.4 }} />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="telegram" name="Telegram" fill={TG} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="instagram" name="Instagram" fill={IG} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReachChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--mut)", strokeDasharray: "3 3" }} />
        <Legend wrapperStyle={legendStyle} />
        <Line type="monotone" dataKey="telegram" name="Telegram" stroke={TG} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="instagram" name="Instagram" stroke={IG} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, color }: { data: { v: number }[]; color: "s1" | "s2" }) {
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey="v" stroke={`var(--${color})`} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
