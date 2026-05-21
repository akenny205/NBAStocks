// The season label used in the CSV for the current/most recent season.
// The CSV uses the year the season ENDS (e.g. 2024-25 season = 2025).
export const CURRENT_SEASON = 2025;

// Days per named range — used for filtering chart data and compare routes.
export const RANGE_DAYS: Record<string, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  "3Y": 1095,
};

// Distinct palette for multi-player comparison charts (up to 8 players).
export const COLORS = [
  "#f97316", // orange
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#eab308", // yellow
  "#14b8a6", // teal
  "#f43f5e", // rose
];
