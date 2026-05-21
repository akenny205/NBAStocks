import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { round2 } from "@/lib/format";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: friendId } = await params;
  const myId = session.user.id;

  // Verify accepted friendship
  const friendship = await db.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: myId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: myId },
      ],
    },
  });

  if (!friendship) return NextResponse.json({ error: "Not friends" }, { status: 403 });

  const positions = await db.userPosition.findMany({
    where: { userId: friendId },
    include: {
      player: { select: { id: true, name: true, isActive: true, currentPrice: true } },
    },
  });

  const enriched = positions.map((p) => {
    const currentPrice = p.player.currentPrice ?? p.avgBuyPrice;
    const currentValue = round2(currentPrice * p.shares);
    const cost = round2(p.avgBuyPrice * p.shares);
    const gainLoss = round2(currentValue - cost);
    const gainLossPct = cost > 0 ? round2((gainLoss / cost) * 100) : 0;
    return {
      id: p.id,
      player: { id: p.player.id, name: p.player.name, isActive: p.player.isActive },
      shares: p.shares,
      avgBuyPrice: p.avgBuyPrice,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
    };
  });

  return NextResponse.json(enriched);
}
