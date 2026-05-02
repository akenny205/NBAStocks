// Converts raw NBA stats into a "stock price" using a fantasy scoring formula.
// This is the core value metric — each game log gets one price point.

export function calcStockPrice(stats: {
  pts?: number | null;
  reb?: number | null;
  ast?: number | null;
  stl?: number | null;
  blk?: number | null;
  turnover?: number | null;
}): number {
  const pts = stats.pts ?? 0;
  const reb = stats.reb ?? 0;
  const ast = stats.ast ?? 0;
  const stl = stats.stl ?? 0;
  const blk = stats.blk ?? 0;
  const to = stats.turnover ?? 0;

  return +(pts + reb * 1.2 + ast * 1.5 + stl * 3 + blk * 3 - to * 1).toFixed(2);
}
