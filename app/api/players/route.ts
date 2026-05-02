// GET /api/players?search=lebron&limit=20&team=LAL&minPrice=10&maxPrice=100&isActive=true
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const team = searchParams.get("team")?.toUpperCase();
  const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive = isActiveParam ? isActiveParam === "true" : undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 5000);

  const where: any = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.currentPrice = {};
    if (minPrice !== undefined) where.currentPrice.gte = minPrice;
    if (maxPrice !== undefined) where.currentPrice.lte = maxPrice;
  }

  const players = await db.player.findMany({
    where,
    select: {
      id: true,
      name: true,
      isActive: true,
      currentPrice: true,
      gameLogs: {
        where: { gameType: "regular", stockPrice: { not: null } },
        orderBy: { gameDate: "desc" },
        select: { team: true, pts: true, reb: true, ast: true },
        take: 100,
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  // Enrich with team and stats
  const enriched = players
    .map((p) => {
      const recentTeam = p.gameLogs.length > 0 ? p.gameLogs[0].team : null;

      // Calculate career stats
      const validLogs = p.gameLogs.filter((g) => g.pts && g.reb !== null && g.ast);
      const careerStats = validLogs.length > 0 ? {
        ppg: parseFloat((validLogs.reduce((s, g) => s + (g.pts ?? 0), 0) / validLogs.length).toFixed(1)),
        rpg: parseFloat((validLogs.reduce((s, g) => s + (g.reb ?? 0), 0) / validLogs.length).toFixed(1)),
        apg: parseFloat((validLogs.reduce((s, g) => s + (g.ast ?? 0), 0) / validLogs.length).toFixed(1)),
      } : null;

      return {
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        currentPrice: p.currentPrice,
        team: recentTeam,
        stats: careerStats,
      };
    })
    .filter((p) => !team || p.team === team);

  return NextResponse.json(enriched);
}

