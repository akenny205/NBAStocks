"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { fmt } from "@/lib/format";
import { rollingAvg, SMOOTH_WINDOW } from "@/lib/smooth";

export type PlayerSeries = {
  id: number;
  name: string;
  currentPrice: number | null;
  series: { date: string; price: number | null; gameType: string }[];
};

// Distinct colors for up to 8 players
const COLORS = [
  "#f97316", // orange
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#eab308", // yellow
  "#14b8a6", // teal
  "#f43f5e", // rose
];

type Props = {
  players: PlayerSeries[];
  range?: string;
};

// Recharts needs a unified date axis — merge all dates into one dataset
function buildChartData(players: PlayerSeries[], range: string) {
  const window = SMOOTH_WINDOW[range] ?? SMOOTH_WINDOW["1Y"];
  const dateMap = new Map<string, Record<string, number | null>>();

  for (const player of players) {
    const prices = player.series.map((p) => p.price);
    const smoothed = rollingAvg(prices, window);
    for (let i = 0; i < player.series.length; i++) {
      const { date } = player.series[i];
      const row = dateMap.get(date) ?? {};
      row[String(player.id)] = smoothed[i];
      dateMap.set(date, row);
    }
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));
}

function formatXAxis(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", year: "2-digit",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs space-y-1 shadow-xl">
      <div className="text-zinc-400 mb-1">
        {new Date(label + "T00:00:00").toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        })}
      </div>
      {payload
        .slice()
        .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
        .map((p: { color: string; name: string; value: number }) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-zinc-300 truncate max-w-32">{p.name}</span>
            <span className="text-white font-semibold ml-auto pl-3">${fmt(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

export function CompareChart({ players, range = "1Y" }: Props) {
  if (players.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">
        Select players below to compare
      </div>
    );
  }

  const chartData = buildChartData(players, range);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-zinc-400 text-xs">{value}</span>
            )}
          />
          {players.map((p, i) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={String(p.id)}
              name={p.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
