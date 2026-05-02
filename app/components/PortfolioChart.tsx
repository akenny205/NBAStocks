"use client";

import { useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fmt } from "@/lib/format";

type ChartPoint = { date: string; value: number };

const RANGES = ["1W", "1M", "3M", "1Y", "ALL"] as const;
type Range = (typeof RANGES)[number];

const RANGE_DAYS: Record<Exclude<Range, "ALL">, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
};

function filterByRange(data: ChartPoint[], range: Range): ChartPoint[] {
  if (range === "ALL" || data.length === 0) return data;
  const days = RANGE_DAYS[range];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = data.filter((d) => d.date >= cutoffStr);
  return filtered.length > 0 ? filtered : data.slice(-5);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  chartData: ChartPoint[];
  totalValue: number;
  gainLoss: number;
  gainLossPct: number;
};

export function PortfolioChart({ chartData, totalValue, gainLoss, gainLossPct }: Props) {
  const [range, setRange] = useState<Range>("ALL");
  const [hovered, setHovered] = useState<ChartPoint | null>(null);

  const filtered = filterByRange(chartData, range);
  const startValue = filtered[0]?.value ?? 0;

  const displayValue = hovered?.value ?? totalValue;
  const displayChange = hovered ? hovered.value - startValue : gainLoss;
  const displayChangePct = hovered
    ? startValue > 0 ? ((hovered.value - startValue) / startValue) * 100 : 0
    : gainLossPct;

  const isUp = displayChange >= 0;
  const color = isUp ? "#22c55e" : "#f97316";
  const colorClass = isUp ? "text-green-400" : "text-orange-400";

  // Recharts' onMouseMove event type is a complex union; `any` is simpler than importing ComposedEvent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]) {
      setHovered(state.activePayload[0].payload as ChartPoint);
    }
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
            <span className="text-zinc-500 font-normal ml-2">{formatDate(hovered.date)}</span>
          )}
        </div>
      </div>

      {/* Chart */}
      {filtered.length > 1 ? (
        <div className="h-52 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filtered}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip content={() => null} />
              <Area
                type="monotone"
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
        <div className="h-52 flex items-center justify-center text-zinc-600 text-sm">
          Not enough data for this range
        </div>
      )}

      {/* Range selector */}
      <div className="flex gap-1 mt-4 border-t border-zinc-900 pt-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              range === r
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
