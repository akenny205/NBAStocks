import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";
import { db } from "@/lib/db";
import { calcStockPrice } from "@/lib/stockPrice";
import { refreshAllPrices } from "@/lib/pricing";
import { ensureAllTickers } from "@/lib/tickers";

const SYNC_SECRET = process.env.SYNC_SECRET || "dev-secret";

async function fetchScoreboard() {
  const response = await fetch("https://www.espn.com/nba/scoreboard", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch scoreboard: ${response.statusText}`);
  }

  return response.text();
}

function extractGameIds(html: string): string[] {
  // Extract game IDs from page JSON data
  const match = html.match(/"gameId":"(\d+)"/g);
  if (!match) return [];

  const gameIds = match
    .map((m) => m.match(/(\d+)/)![1])
    .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

  return gameIds;
}

async function fetchBoxScore(gameId: string) {
  const response = await fetch(`https://www.espn.com/nba/boxscore/${gameId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch box score for game ${gameId}`);
  }

  return response.text();
}

interface PlayerStats {
  playerName: string;
  team: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
}

function parseBoxScore(html: string): PlayerStats[] {
  const $ = load(html);
  const players: PlayerStats[] = [];

  try {
    // Find team abbreviations from scoreboard
    const teamSpans = $("span").filter((_, el) => {
      return /^\w{3}$/.test($(el).text());
    });
    const teams = teamSpans
      .slice(0, 2)
      .map((_, el) => $(el).text().toUpperCase())
      .get();

    if (teams.length < 2) {
      console.warn("Could not extract team abbreviations from box score");
      return [];
    }

    // Parse both home and away team stats
    teams.forEach((teamAbbr, teamIdx) => {
      // Find the stats table for this team
      const tables = $("table");
      let teamStats: PlayerStats[] = [];

      tables.each((_, table) => {
        const rows = $(table).find("tbody tr");
        rows.each((_, row) => {
          const cells = $(row).find("td");
          if (cells.length < 12) return;

          const playerNameCell = $(cells[0]).text().trim();
          if (
            !playerNameCell ||
            playerNameCell === "BENCH" ||
            playerNameCell === "DNP"
          ) {
            return;
          }

          const pts = parseInt($(cells[1]).text()) || 0;
          const reb = parseInt($(cells[4]).text()) || 0;
          const ast = parseInt($(cells[5]).text()) || 0;
          const stl = parseInt($(cells[8]).text()) || 0;
          const blk = parseInt($(cells[9]).text()) || 0;
          const tov = parseInt($(cells[10]).text()) || 0;

          teamStats.push({
            playerName: playerNameCell,
            team: teams[teamIdx],
            pts,
            reb,
            ast,
            stl,
            blk,
            tov,
          });
        });
      });

      players.push(...teamStats);
    });
  } catch (err) {
    console.error("Error parsing box score:", err);
  }

  return players;
}

async function upsertGameLogs(allPlayers: PlayerStats[], gameId: string) {
  let totalProcessed = 0;

  for (const player of allPlayers) {
    try {
      const stockPrice = calcStockPrice({
        pts: player.pts,
        reb: player.reb,
        ast: player.ast,
        stl: player.stl,
        blk: player.blk,
        turnover: player.tov,
      });

      console.log(
        `Processed: ${player.playerName} (${player.team}) - Stock Price: ${stockPrice}`
      );
      totalProcessed++;

      // Note: ESPN scraping doesn't easily provide player IDs
      // In production, you'd need a player name -> ID mapping
      // This could be done by:
      // 1. Fuzzy matching against players in your DB
      // 2. Building a name->ID cache
      // 3. Using ESPN's player pages to extract IDs
    } catch (err) {
      console.error(`Failed to process player ${player.playerName}:`, err);
    }
  }

  return totalProcessed;
}

export async function POST(req: NextRequest) {
  try {
    // Validate secret
    const authHeader = req.headers.get("authorization");
    if (
      authHeader !== `Bearer ${SYNC_SECRET}` &&
      req.nextUrl.searchParams.get("secret") !== SYNC_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[ESPN SYNC] Fetching scoreboard...");
    const scoreboardHtml = await fetchScoreboard();

    console.log("[ESPN SYNC] Extracting game IDs...");
    const gameIds = extractGameIds(scoreboardHtml);
    console.log(`[ESPN SYNC] Found ${gameIds.length} games`);

    let totalPlayers = 0;

    for (const gameId of gameIds.slice(0, 3)) {
      // Limit to first 3 games for testing
      try {
        console.log(`[ESPN SYNC] Fetching box score for game ${gameId}...`);
        const boxScoreHtml = await fetchBoxScore(gameId);

        const players = parseBoxScore(boxScoreHtml);
        console.log(
          `[ESPN SYNC] Parsed ${players.length} players from game ${gameId}`
        );

        totalPlayers += await upsertGameLogs(players, gameId);
      } catch (err) {
        console.error(`Failed to process game ${gameId}:`, err);
      }
    }

    console.log("[ESPN SYNC] Refreshing player prices...");
    const priced = await refreshAllPrices(db);
    console.log(`[ESPN SYNC] Updated ${priced} player prices`);

    console.log("[ESPN SYNC] Assigning tickers to any new players...");
    const tickersAssigned = await ensureAllTickers(db);
    if (tickersAssigned > 0) {
      console.log(`[ESPN SYNC] Assigned ${tickersAssigned} new tickers`);
    }

    return NextResponse.json({
      success: true,
      message:
        "ESPN scraper working - extracts scores but needs player ID mapping to upsert",
      gamesFetched: Math.min(gameIds.length, 3),
      playersProcessed: totalPlayers,
      playersUpdated: priced,
    });
  } catch (err) {
    console.error("[ESPN SYNC] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
