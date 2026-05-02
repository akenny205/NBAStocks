// Run with: npm run db:seed
// Reads data/traditional.csv and loads all player game logs into the DB.
// Resumable — progress saved per season. Re-run after any failure to continue.

import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { calcStockPrice } from "../lib/stockPrice";
import { CURRENT_SEASON } from "../lib/constants";

const CSV_PATH = path.join(__dirname, "../data/traditional.csv");
const PROGRESS_FILE = path.join(__dirname, ".seed-progress.json");
const BATCH_SIZE = 250;

// ── DB with auto-reconnect ────────────────────────────────────────────────────

function makeDb() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

let db = makeDb();

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isConnErr = msg.includes("connection") || msg.includes("queryable") || msg.includes("P1001") || msg.includes("P1017");
      if (isConnErr && i < attempts - 1) {
        const wait = (i + 1) * 3000;
        console.warn(`\n  Connection error, retrying in ${wait / 1000}s... (attempt ${i + 1}/${attempts})`);
        await new Promise(r => setTimeout(r, wait));
        db = makeDb(); // fresh connection
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// ── Progress tracking ─────────────────────────────────────────────────────────

type Progress = {
  playersSeeded: boolean;
  seasonsComplete: number[];
};

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  }
  return { playersSeeded: false, seasonsComplete: [] };
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ── CSV types ─────────────────────────────────────────────────────────────────

type CsvRow = {
  gameid: string; date: string; type: string;
  playerid: string; player: string; team: string;
  home: string; away: string;
  MIN: string; PTS: string; FGM: string; FGA: string; "FG%": string;
  "3PM": string; "3PA": string; "3P%": string;
  FTM: string; FTA: string; "FT%": string;
  OREB: string; DREB: string; REB: string;
  AST: string; STL: string; BLK: string; TOV: string; PF: string;
  "+/-": string; win: string; season: string;
};

function int(v: string): number | null {
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

function float(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const progress = loadProgress();

  console.log("Reading CSV...");
  const rows: CsvRow[] = await new Promise((resolve, reject) => {
    const acc: CsvRow[] = [];
    fs.createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on("data", (row: CsvRow) => acc.push(row))
      .on("end", () => resolve(acc))
      .on("error", reject);
  });
  console.log(`  ${rows.length.toLocaleString()} rows loaded`);

  // ── Players ───────────────────────────────────────────────────────────────
  if (progress.playersSeeded) {
    console.log("\nPlayers already seeded, skipping.");
  } else {
    console.log("\nBuilding player list...");
    const playerMap = new Map<number, { name: string; isActive: boolean }>();
    for (const row of rows) {
      const id = parseInt(row.playerid);
      const isActive = parseInt(row.season) === CURRENT_SEASON;
      const existing = playerMap.get(id);
      if (!existing) {
        playerMap.set(id, { name: row.player, isActive });
      } else if (isActive) {
        existing.isActive = true;
      }
    }
    console.log(`  ${playerMap.size.toLocaleString()} unique players (${[...playerMap.values()].filter(p => p.isActive).length} active)`);

    console.log("Upserting players...");
    const entries = [...playerMap.entries()];
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await withRetry(() =>
        Promise.all(
          batch.map(([id, { name, isActive }]) =>
            db.player.upsert({
              where: { id },
              update: { name, isActive },
              create: { id, name, isActive },
            })
          )
        )
      );
      process.stdout.write(`\r  ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length}`);
    }
    progress.playersSeeded = true;
    saveProgress(progress);
    console.log("\n  ✓ done");
  }

  // ── Game logs ─────────────────────────────────────────────────────────────
  const bySeason = new Map<number, CsvRow[]>();
  for (const row of rows) {
    const s = parseInt(row.season);
    const list = bySeason.get(s) ?? [];
    list.push(row);
    bySeason.set(s, list);
  }

  const seasons = [...bySeason.keys()].sort();
  const remaining = seasons.filter(s => !progress.seasonsComplete.includes(s));
  console.log(`\nInserting game logs — ${progress.seasonsComplete.length} seasons already done, ${remaining.length} remaining...`);

  for (const season of remaining) {
    const seasonRows = bySeason.get(season)!;
    let inserted = 0;

    for (let i = 0; i < seasonRows.length; i += BATCH_SIZE) {
      const batch = seasonRows.slice(i, i + BATCH_SIZE);

      const data = batch.map((row) => {
        const pts = int(row.PTS);
        const reb = int(row.REB);
        const ast = int(row.AST);
        const stl = int(row.STL);
        const blk = int(row.BLK);
        const tov = int(row.TOV);
        const sp = calcStockPrice({ pts, reb, ast, stl, blk, turnover: tov });

        return {
          playerId: parseInt(row.playerid),
          gameId: parseInt(row.gameid),
          gameDate: new Date(row.date),
          season,
          gameType: row.type,
          team: row.team,
          isHome: row.team === row.home,
          min: float(row.MIN),
          pts, reb, ast, stl, blk, tov,
          fgm: int(row.FGM), fga: int(row.FGA),
          fg3m: int(row["3PM"]), fg3a: int(row["3PA"]),
          ftm: int(row.FTM), fta: int(row.FTA),
          oreb: int(row.OREB), dreb: int(row.DREB),
          pf: int(row.PF),
          plusMinus: float(row["+/-"]),
          win: row.win === "1" || row.win === "1.0" ? true : row.win === "0" || row.win === "0.0" ? false : null,
          stockPrice: sp > 0 ? sp : null,
        };
      });

      await withRetry(() => db.gameLog.createMany({ data, skipDuplicates: true }));
      inserted += batch.length;
      process.stdout.write(`\r  season ${season}: ${inserted} / ${seasonRows.length}`);
    }

    progress.seasonsComplete.push(season);
    saveProgress(progress);
    console.log(`\r  ✓ season ${season}: ${inserted.toLocaleString()} rows`);
  }

  console.log("\nSeed complete!");
  fs.unlinkSync(PROGRESS_FILE);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
