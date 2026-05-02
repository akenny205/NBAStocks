import type { PrismaClient } from "@prisma/client";

// ── Ticker generation ─────────────────────────────────────────────────────────

const MAX_ROOT = 8;

function toAlpha(s: string): string {
  return s.toUpperCase().replace(/[^A-Z]/g, "");
}

function rootFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  // Use last name, strip punctuation/hyphens, cap at MAX_ROOT chars
  return toAlpha(parts[parts.length - 1]).slice(0, MAX_ROOT);
}

function generateTicker(name: string, taken: Set<string>): string {
  const root = rootFromName(name);
  if (!taken.has(root)) return root;
  // Numeric suffix: JAMES2, JAMES3, …
  for (let i = 2; i <= 999; i++) {
    const candidate = root + i;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Could not generate ticker for: ${name}`);
}

// ── DB operations ─────────────────────────────────────────────────────────────

/**
 * Finds any players missing a ticker and assigns them one.
 * Safe to call from API routes (DB-only, no filesystem writes).
 * Returns the number of tickers assigned.
 */
export async function ensureAllTickers(db: PrismaClient): Promise<number> {
  // Active players first (by price desc), then inactive — so current stars get clean tickers
  const players = await db.player.findMany({
    select: { id: true, name: true, ticker: true, isActive: true, currentPrice: true },
    orderBy: [
      { isActive: "desc" },
      { currentPrice: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ],
  });

  const taken = new Set(players.flatMap((p) => (p.ticker ? [p.ticker] : [])));
  const missing = players.filter((p) => !p.ticker);
  if (missing.length === 0) return 0;

  for (const player of missing) {
    const ticker = generateTicker(player.name, taken);
    taken.add(ticker);
    await db.player.update({ where: { id: player.id }, data: { ticker } });
  }

  return missing.length;
}

// ── File map (scripts only) ───────────────────────────────────────────────────

export type TickerEntry = { ticker: string; id: number; name: string };

export type TickerMap = {
  generated: string;
  count: number;
  entries: TickerEntry[];
};

/**
 * Reads all players+tickers from the DB and writes data/tickers.json.
 * Only call from scripts — Vercel's filesystem is read-only.
 */
export async function writeTickerMapFile(db: PrismaClient, filePath: string): Promise<void> {
  const { writeFileSync } = await import("fs");

  const players = await db.player.findMany({
    where: { ticker: { not: null } },
    select: { id: true, name: true, ticker: true },
    orderBy: { ticker: "asc" },
  });

  const map: TickerMap = {
    generated: new Date().toISOString(),
    count: players.length,
    entries: players.map((p) => ({ ticker: p.ticker!, id: p.id, name: p.name })),
  };

  writeFileSync(filePath, JSON.stringify(map, null, 2), "utf8");
}
