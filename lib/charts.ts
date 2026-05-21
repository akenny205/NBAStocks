// Shared chart utilities used by PlayerChart and PortfolioChart

/** Compute evenly-spaced tick dates snapped to the nearest actual data point. */
export function getTicks(data: { date: string }[], tickIntervalDays: number): string[] {
  if (data.length < 2) return [];
  const first = new Date(data[0].date + "T00:00:00");
  const last = new Date(data[data.length - 1].date + "T00:00:00");

  const ticks: string[] = [];
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() + tickIntervalDays);

  while (cursor <= last) {
    const target = cursor.getTime();
    const closest = data.reduce((a, b) =>
      Math.abs(new Date(a.date + "T00:00:00").getTime() - target) <=
      Math.abs(new Date(b.date + "T00:00:00").getTime() - target)
        ? a : b
    );
    if (!ticks.includes(closest.date)) ticks.push(closest.date);
    cursor.setDate(cursor.getDate() + tickIntervalDays);
  }

  return ticks;
}

/** Full date label used in tooltips and hover displays. */
export function formatFullDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/**
 * Compact date label used for axis ticks.
 * showYear=true → "Jan '25", false → "Jan 5"
 */
export function formatTickDate(dateStr: string, showYear: boolean): string {
  const d = new Date(dateStr + "T00:00:00");
  if (showYear) return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
