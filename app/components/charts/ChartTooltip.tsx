import { fmt } from "@/lib/format";
import { formatFullDate } from "@/lib/charts";

type Props = {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValue?: (point: any) => number;
};

/**
 * Drop-in Recharts tooltip used by both PlayerChart and PortfolioChart.
 * Pass a getValue callback to extract the displayed price from each data point.
 * Recharts automatically injects active/payload; getValue comes from the parent.
 */
export function ChartTooltip({ active, payload, getValue }: Props) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const price = getValue ? getValue(point) : (point.value ?? point.stockPrice ?? 0);
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none">
      <div className="text-white font-semibold">${fmt(price)}</div>
      <div className="text-zinc-500 mt-0.5">{formatFullDate(point.date)}</div>
    </div>
  );
}
