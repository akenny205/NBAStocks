"use client";

import { useState, useCallback, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fmt } from "@/lib/format";
import { RANGE_DAYS } from "@/lib/constants";
import { getTicks, formatFullDate, formatTickDate } from "@/lib/charts";
import { rollingAvg, SMOOTH_WINDOW } from "@/lib/smooth";
import { ChartTooltip } from "@/app/components/charts/ChartTooltip";
import { ChartEmptyState } from "@/app/components/charts/ChartEmptyState";

export type GamePoint = {
  date: string;
  stockPrice: number;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  gameType: string;
  win: boolean | null;
};

const RANGES = ["1M", "3M", "1Y", "3Y", "ALL"] as const;
type Range = (typeof RANGES)[number];

const TICK_INTERVAL_DAYS: Record<Range, number> = {
  "1M": 7,
  "3M": 30,
  "1Y": 60,
  "3Y": 180,
  "ALL": 365,
};

function filterByRange(data: GamePoint[], range: Range): GamePoint[] {
  if (range === "ALL" || data.length === 0) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = data.filter((d) => d.date >= cutoffStr);
  return filtered.length > 1 ? filtered : data.slice(-10);
}

type ChartPoint = GamePoint & { smoothed: number | null };

type Props = {
  data: GamePoint[];
  currentPrice: number;
  playerName: string;
};

export function PlayerChart({ data, currentPrice }: Props) {
  const [range, setRange] = useState<Range>("1Y");
  const [hovered, setHovered] = useState<ChartPoint | null>(null);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const filtered = filterByRange(data, range);
    const smoothed = rollingAvg(filtered.map((d) => d.stockPrice), SMOOTH_WINDOW[range]);
    return filtered.map((d, i) => ({ ...d, smoothed: smoothed[i] }));
  }, [data, range]);

  const showYear = range === "1Y" || range === "3Y" || range === "ALL";
  const ticks = getTicks(chartPoints, TICK_INTERVAL_DAYS[range]);

  const startPrice = chartPoints[0]?.smoothed ?? chartPoints[0]?.stockPrice ?? currentPrice;
  const displayPrice = hovered?.smoothed ?? currentPrice;
  const displayChange = displayPrice - startPrice;
  const displayChangePct = startPrice > 0 ? (displayChange / startPrice) * 100 : 0;
  const isUp = displayChange >= 0;
  const color = isUp ? "#22c55e" : "#f97316";
  const colorClass = isUp ? "text-green-400" : "text-orange-400";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]) setHovered(state.activePayload[0].payload as ChartPoint);
  }, []);
  const handleMouseLeave = useCallback(() => setHovered(null), []);

  const avg = chartPoints.length > 0
    ? chartPoints.reduce((s, d) => s + (d.smoothed ?? d.stockPrice), 0) / chartPoints.length
    : 0;

  return (
    <div>
      {/* Price display */}
      <div className="mb-1">
        <div className="text-4xl font-bold text-white tracking-tight">
          ${fmt(displayPrice)}
        </div>
        <div className={`mt-1 text-sm font-medium ${colorClass}`}>
          {displayChange >= 0 ? "+" : ""}${fmt(displayChange)}{" "}
          ({displayChangePct >= 0 ? "+" : ""}{displayChangePct.toFixed(2)}%)
          {hovered ? (
            <span className="text-zinc-500 font-normal ml-2">{formatFullDate(hovered.date)}</span>
          ) : (
            <span className="text-zinc-500 font-normal ml-2">vs. start of range</span>
          )}
        </div>
      </div>

      {/* Hovered game stats */}
      <div className="h-8 mb-4">
        {hovered && (
          <div className="flex gap-4 text-xs text-zinc-500">
            <span className={hovered.win ? "text-green-400" : "text-orange-400"}>
              {hovered.win ? "W" : "L"}
            </span>
            {hovered.gameType !== "regular" && (
              <span className="text-yellow-500 capitalize">{hovered.gameType}</span>
            )}
            <span>{hovered.pts ?? "—"} PTS</span>
            <span>{hovered.reb ?? "—"} REB</span>
            <span>{hovered.ast ?? "—"} AST</span>
            <span>{hovered.stl ?? "—"} STL</span>
            <span>{hovered.blk ?? "—"} BLK</span>
            <span>{hovered.tov ?? "—"} TOV</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartPoints.length > 1 ? (
        <div className="h-56 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} margin={{ bottom: 4 }}>
              <defs>
                <linearGradient id="playerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                ticks={ticks}
                tickFormatter={(v) => formatTickDate(v, showYear)}
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                content={<ChartTooltip getValue={(p) => p.smoothed ?? p.stockPrice} />}
                cursor={{ stroke: "#52525b", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <ReferenceLine y={avg} stroke="#3f3f46" strokeDasharray="4 4" />
              <Area
                type="linear"
                dataKey="smoothed"
                stroke={color}
                strokeWidth={2}
                fill="url(#playerGradient)"
                dot={false}
                activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={500}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmptyState message="No game activity recorded in the selected period." />
      )}

      {/* Range + avg */}
      <div className="flex items-center justify-between mt-3 border-t border-zinc-900 pt-3">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                range === r ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-600">
          {SMOOTH_WINDOW[range]}-game avg · {chartPoints.length} games
        </span>
      </div>
    </div>
  );
}
