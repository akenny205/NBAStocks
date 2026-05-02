import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playerId, shares } = await req.json();

    if (!playerId || !shares || shares <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { id: playerId } });
    if (!player || !player.currentPrice) {
      return NextResponse.json({ error: "Player not found or no price" }, { status: 404 });
    }

    const price = player.currentPrice;
    const total = price * shares;

    // Check balance
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.balance < total) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Create transaction record
    await db.userTransaction.create({
      data: {
        userId: session.user.id,
        playerId,
        type: "buy",
        shares,
        price,
        total,
      },
    });

    // Deduct from balance
    await db.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: total } },
    });

    // Update or create position
    const existing = await db.userPosition.findUnique({
      where: { userId_playerId: { userId: session.user.id, playerId } },
    });

    if (existing) {
      // Average down if already holding
      const newShares = existing.shares + shares;
      const newAvgPrice = (existing.avgBuyPrice * existing.shares + total) / newShares;
      await db.userPosition.update({
        where: { id: existing.id },
        data: { shares: newShares, avgBuyPrice: newAvgPrice },
      });
    } else {
      // Create new position
      await db.userPosition.create({
        data: {
          userId: session.user.id,
          playerId,
          shares,
          avgBuyPrice: price,
        },
      });
    }

    return NextResponse.json({ success: true, transaction: { playerId, shares, price, total } });
  } catch (error) {
    console.error("Buy error:", error);
    return NextResponse.json({ error: "Failed to buy" }, { status: 500 });
  }
}

