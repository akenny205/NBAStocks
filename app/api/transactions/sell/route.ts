import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { positionId, shares } = await req.json();

    if (!positionId || !shares || shares <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const position = await db.userPosition.findUnique({
      where: { id: positionId },
      include: { player: true },
    });

    if (!position || position.userId !== session.user.id) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    if (shares > position.shares) {
      return NextResponse.json({ error: "Insufficient shares" }, { status: 400 });
    }

    const player = position.player;
    if (!player.currentPrice) {
      return NextResponse.json({ error: "No current price" }, { status: 400 });
    }

    const price = player.currentPrice;
    const total = price * shares;

    // Create transaction record
    await db.userTransaction.create({
      data: {
        userId: session.user.id,
        playerId: position.playerId,
        type: "sell",
        shares,
        price,
        total,
      },
    });

    // Add proceeds to balance
    await db.user.update({
      where: { id: session.user.id },
      data: { balance: { increment: total } },
    });

    // Update position
    const remainingShares = position.shares - shares;
    if (remainingShares <= 0) {
      await db.userPosition.delete({ where: { id: positionId } });
    } else {
      await db.userPosition.update({
        where: { id: positionId },
        data: { shares: remainingShares },
      });
    }

    return NextResponse.json({ success: true, transaction: { positionId, shares, price, total } });
  } catch (error) {
    console.error("Sell error:", error);
    return NextResponse.json({ error: "Failed to sell" }, { status: 500 });
  }
}
