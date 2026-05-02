// GET /api/players/[id]
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const player = await db.player.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      name: true,
      isActive: true,
      currentPrice: true,
      priceUpdatedAt: true,
    },
  });

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  return NextResponse.json(player);
}
