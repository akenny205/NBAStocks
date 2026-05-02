// GET /api/players/[id]/stats?season=2025&type=regular
// Returns game-by-game stock price data for charting
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const season = searchParams.get("season") ? parseInt(searchParams.get("season")!) : undefined;
  const gameType = searchParams.get("type") ?? undefined;

  const logs = await db.gameLog.findMany({
    where: {
      playerId: parseInt(id),
      ...(season ? { season } : {}),
      ...(gameType ? { gameType } : {}),
    },
    orderBy: { gameDate: "asc" },
    select: {
      gameDate: true,
      season: true,
      gameType: true,
      team: true,
      isHome: true,
      pts: true,
      reb: true,
      ast: true,
      stl: true,
      blk: true,
      tov: true,
      min: true,
      plusMinus: true,
      win: true,
      stockPrice: true,
    },
  });

  if (!logs.length) return NextResponse.json({ error: "No data found" }, { status: 404 });
  return NextResponse.json(logs);
}
