import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  const player = await db.player.findFirst({
    where: { ticker: { equals: ticker.toUpperCase() } },
    select: { id: true, name: true, ticker: true, currentPrice: true, isActive: true },
  });

  if (!player) {
    return NextResponse.json({ error: `Ticker ${ticker.toUpperCase()} not found` }, { status: 404 });
  }

  return NextResponse.json(player);
}
