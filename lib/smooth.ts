/**
 * Rolling average smoothing for price charts.
 *
 * Each point becomes the average of the [window] games centered on it
 * (or trailing at the edges). Larger windows = smoother line.
 *
 * Window sizes by range:
 *   1M  → 3  (small, you want some detail up close)
 *   3M  → 5
 *   1Y  → 7
 *   3Y  → 10
 *   ALL → 15
 */

export const SMOOTH_WINDOW: Record<string, number> = {
  "1M": 3,
  "3M": 5,
  "1Y": 7,
  "3Y": 10,
  "ALL": 15,
};

export function rollingAvg(
  values: (number | null)[],
  window: number
): (number | null)[] {
  return values.map((_, i) => {
    const half = Math.floor(window / 2);
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);
    const slice = values.slice(start, end + 1).filter((v): v is number => v !== null);
    if (slice.length === 0) return null;
    return parseFloat((slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(2));
  });
}
