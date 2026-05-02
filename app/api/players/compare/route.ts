// GET /api/players/compare?ids=123,456,789&range=1Y
// Returns price-over-time series for multiple players in one query.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const RANGE_DAYS: Record<string, number> = {
  "1M": 30, "3M": 90, "1Y": 365, "3Y": 1095,
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0)
    .slice(0, 8); // cap at 8 players

  const range = searchParams.get("range") ?? "1Y";

  if (ids.length === 0) {
    return NextResponse.json({ error: "No player IDs provided" }, { status: 400 });
  }

  const minDate = RANGE_DAYS[range]
    ? new Date(Date.now() - RANGE_DAYS[range] * 86400_000)
    : undefined;

  const players = await db.player.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      isActive: true,
      currentPrice: true,
      gameLogs: {
        where: {
          stockPrice: { not: null },
          ...(minDate ? { gameDate: { gte: minDate } } : {}),
        },
        orderBy: { gameDate: "asc" },
        select: { gameDate: true, stockPrice: true, gameType: true },
      },
    },
  });

  const result = players.map((p) => ({
    id: p.id,
    name: p.name,
    isActive: p.isActive,
    currentPrice: p.currentPrice,
    series: p.gameLogs.map((g) => ({
      date: g.gameDate.toISOString().split("T")[0],
      price: g.stockPrice,
      gameType: g.gameType,
    })),
  }));

  return NextResponse.json(result);
}
