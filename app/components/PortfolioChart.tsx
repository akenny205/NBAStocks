"use client";

import { useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { fmt } from "@/lib/format";
import { RANGE_DAYS } from "@/lib/constants";
import { getTicks, formatFullDate, formatTickDate } from "@/lib/charts";
import { ChartTooltip } from "@/app/components/charts/ChartTooltip";
import { ChartEmptyState } from "@/app/components/charts/ChartEmptyState";

type ChartPoint = { date: string; value: number };

const RANGES = ["1W", "1M", "3M", "1Y", "ALL"] as const;
type Range = (typeof RANGES)[number];

const TICK_INTERVAL_DAYS: Record<Range, number> = {
  "1W": 1,
  "1M": 7,
  "3M": 30,
  "1Y": 60,
  "ALL": 180,
};

function filterByRange(data: ChartPoint[], range: Range): ChartPoint[] {
  if (range === "ALL" || data.length === 0) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = data.filter((d) => d.date >= cutoffStr);
  return filtered.length > 0 ? filtered : data.slice(-5);
}

type Props = {
  chartData: ChartPoint[];
  positionsValue: number;
  balance: number;
  gainLoss: number;
  gainLossPct: number;
};

export function PortfolioChart({ chartData, positionsValue, balance, gainLoss, gainLossPct }: Props) {
  const [range, setRange] = useState<Range>("ALL");
  const [hovered, setHovered] = useState<ChartPoint | null>(null);

  const filtered = filterByRange(chartData, range);
  const startValue = filtered[0]?.value ?? 0;

  const displayValue = hovered?.value ?? positionsValue;
  const displayChange = hovered ? hovered.value - startValue : gainLoss;
  const displayChangePct = hovered
    ? startValue > 0 ? ((hovered.value - startValue) / startValue) * 100 : 0
    : gainLossPct;

  const isUp = displayChange >= 0;
  const color = isUp ? "#22c55e" : "#f97316";
  const colorClass = isUp ? "text-green-400" : "text-orange-400";

  const showYear = range === "1Y" || range === "ALL";
  const ticks = getTicks(filtered, TICK_INTERVAL_DAYS[range]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]) setHovered(state.activePayload[0].payload as ChartPoint);
  }, []);
  const handleMouseLeave = useCallback(() => setHovered(null), []);

  return (
    <div>
      {/* Value display */}
      <div className="mb-6">
        <div className="text-5xl font-bold text-white tracking-tight">
          ${fmt(displayValue)}
        </div>
        <div className={`mt-1 text-sm font-medium ${colorClass}`}>
          {displayChange >= 0 ? "+" : ""}${fmt(displayChange)}{" "}
          ({displayChangePct >= 0 ? "+" : ""}{displayChangePct.toFixed(2)}%)
          {hovered && (
            <span className="text-zinc-500 font-normal ml-2">{formatFullDate(hovered.date)}</span>
          )}
        </div>
      </div>

      {/* Chart */}
      {filtered.length > 1 ? (
        <div className="h-56 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} margin={{ bottom: 4 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
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
                content={<ChartTooltip getValue={(p) => p.value} />}
                cursor={{ stroke: "#52525b", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="linear"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmptyState message="No trades or game activity recorded in the selected period." />
      )}

      {/* Range selector */}
      <div className="flex gap-1 mt-4 border-t border-zinc-800/60 pt-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              range === r ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Buying power */}
      <div className="mt-5 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Buying power</span>
        <span className="text-sm font-bold text-white tabular-nums">${fmt(balance)}</span>
      </div>
    </div>
  );
}
