/**
 * Player Pricing Engine — Multi-Season Blended EWMA
 *
 * Price = weighted blend of up to 3 seasons of data.
 *
 * Within each season: exponentially weighted moving average (EWMA) — recent
 * games carry more weight than older ones (hot/cold streaks move the price).
 *
 * Cross-season blend: current season weight scales linearly from 0→70% as the
 * season progresses (0→82 games). Prior seasons fill the remaining weight so
 * early-season prices are anchored to historical performance rather than 3
 * noisy games.
 *
 *   currentWeight  = clamp(gamesThisSeason / 82, 0, 1) × 0.70
 *   remaining      = 1 - currentWeight
 *   prevWeight     = remaining × 0.65   (last season)
 *   prev2Weight    = remaining × 0.35   (two seasons ago)
 *
 * Retired / inactive players: price is frozen at their final value forever.
 * Players with no data: skipped (no price stored).
 */

import { PrismaClient } from "@prisma/client";
import { round2 } from "@/lib/format";

const NBA_SEASON_LENGTH = 82;
const EWMA_WINDOW = 20; // games used for within-season EWMA

// ── Within-season EWMA ────────────────────────────────────────────────────────

/**
 * Compute a single season's price from its game logs.
 * Logs must be sorted descending (most recent first).
 * Returns null if there are no valid logs.
 */
function seasonEWMA(logs: { stockPrice: number | null }[]): number | null {
  const valid = logs
    .slice(0, EWMA_WINDOW)
    .filter((l): l is { stockPrice: number } => l.stockPrice !== null);

  if (valid.length === 0) return null;

  // Weight: most recent game = valid.length, oldest = 1
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < valid.length; i++) {
    const weight = valid.length - i;
    weightedSum += valid[i].stockPrice * weight;
    totalWeight += weight;
  }

  return weightedSum / totalWeight;
}

// ── Cross-season blend ────────────────────────────────────────────────────────

type SeasonData = {
  season: number;
  logs: { stockPrice: number | null }[]; // sorted descending
};

/**
 * Compute a blended price across up to 3 seasons.
 * Seasons must be sorted descending (most recent first).
 */
export function computePrice(seasons: SeasonData[]): number {
  if (seasons.length === 0) return 0;

  const [current, prev, prev2] = seasons;

  const currentEWMA = current ? seasonEWMA(current.logs) : null;
  const prevEWMA = prev ? seasonEWMA(prev.logs) : null;
  const prev2EWMA = prev2 ? seasonEWMA(prev2.logs) : null;

  if (!prevEWMA && !prev2EWMA) {
    return currentEWMA !== null ? round2(currentEWMA) : 0;
  }

  // Current season weight grows as the season progresses
  const gamesThisSeason = (current?.logs ?? []).filter((l) => l.stockPrice !== null).length;
  const currentWeight = Math.min(gamesThisSeason / NBA_SEASON_LENGTH, 1) * 0.70;
  const remaining = 1 - currentWeight;

  // Distribute remaining weight across prior seasons
  const hasPrev = prevEWMA !== null;
  const hasPrev2 = prev2EWMA !== null;

  let prevWeight = 0;
  let prev2Weight = 0;

  if (hasPrev && hasPrev2) {
    prevWeight = remaining * 0.65;
    prev2Weight = remaining * 0.35;
  } else if (hasPrev) {
    prevWeight = remaining;
  } else if (hasPrev2) {
    prev2Weight = remaining;
  }

  // If we have no current season data at all, redistribute its weight
  if (currentEWMA === null) {
    const total = prevWeight + prev2Weight;
    if (total === 0) return 0;
    prevWeight = hasPrev ? prevWeight / total : 0;
    prev2Weight = hasPrev2 ? prev2Weight / total : 0;
  }

  let price = 0;
  if (currentEWMA !== null) price += currentEWMA * currentWeight;
  if (prevEWMA !== null) price += prevEWMA * prevWeight;
  if (prev2EWMA !== null) price += prev2EWMA * prev2Weight;

  return round2(price);
}

// ── DB helpers ────────────────────────────────────────────────────────────────

/**
 * Refresh prices for every player in the DB.
 * Active players: always recalculate.
 * Inactive/retired players: only price if they don't have one yet (freeze on retirement).
 */
export async function refreshAllPrices(db: PrismaClient): Promise<number> {
  // Determine the 3 most recent seasons present in the DB
  const seasonRows = await db.gameLog.groupBy({
    by: ["season"],
    orderBy: { season: "desc" },
    take: 3,
  });
  const seasons = seasonRows.map((r) => r.season);

  if (seasons.length === 0) return 0;

  const BATCH = 100;
  let offset = 0;
  let updated = 0;
  const now = new Date();

  while (true) {
    const players = await db.player.findMany({
      skip: offset,
      take: BATCH,
      select: {
        id: true,
        isActive: true,
        currentPrice: true,
        gameLogs: {
          where: {
            season: { in: seasons },
            stockPrice: { not: null },
          },
          orderBy: { gameDate: "desc" },
          select: { season: true, stockPrice: true },
        },
      },
    });

    if (players.length === 0) break;

    for (const player of players) {
      // Retired with a frozen price — skip
      if (!player.isActive && player.currentPrice !== null) continue;

      // Group logs by season
      const bySeasonMap = new Map<number, { stockPrice: number | null }[]>();
      for (const log of player.gameLogs) {
        const existing = bySeasonMap.get(log.season) ?? [];
        existing.push({ stockPrice: log.stockPrice });
        bySeasonMap.set(log.season, existing);
      }

      const seasonData: SeasonData[] = seasons
        .map((s) => ({ season: s, logs: bySeasonMap.get(s) ?? [] }))
        .filter((s) => s.logs.length > 0);

      const price = computePrice(seasonData);
      if (price === 0) continue;

      await db.player.update({
        where: { id: player.id },
        data: { currentPrice: price, priceUpdatedAt: now },
      });
      updated++;
    }

    offset += players.length;
    if (players.length < BATCH) break;
  }

  return updated;
}

/**
 * Refresh price for a single player (called after syncing new game logs).
 */
export async function refreshPlayerPrice(
  db: PrismaClient,
  playerId: number
): Promise<void> {
  const seasonRows = await db.gameLog.groupBy({
    by: ["season"],
    orderBy: { season: "desc" },
    take: 3,
  });
  const seasons = seasonRows.map((r) => r.season);

  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      isActive: true,
      currentPrice: true,
      gameLogs: {
        where: { season: { in: seasons }, stockPrice: { not: null } },
        orderBy: { gameDate: "desc" },
        select: { season: true, stockPrice: true },
      },
    },
  });

  if (!player) return;
  if (!player.isActive && player.currentPrice !== null) return; // frozen

  const bySeasonMap = new Map<number, { stockPrice: number | null }[]>();
  for (const log of player.gameLogs) {
    const existing = bySeasonMap.get(log.season) ?? [];
    existing.push({ stockPrice: log.stockPrice });
    bySeasonMap.set(log.season, existing);
  }

  const seasonData: SeasonData[] = seasons
    .map((s) => ({ season: s, logs: bySeasonMap.get(s) ?? [] }))
    .filter((s) => s.logs.length > 0);

  const price = computePrice(seasonData);
  if (price === 0) return;

  await db.player.update({
    where: { id: playerId },
    data: { currentPrice: price, priceUpdatedAt: new Date() },
  });
}
