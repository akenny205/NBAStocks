import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

async function verifyToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), secret);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, ticker, shares, limitPrice, debug } = body as {
    action: "buy" | "sell";
    ticker: string;
    shares: number;
    limitPrice?: number;
    debug?: boolean;
  };

  if (!action || !ticker || !shares || shares <= 0) {
    return NextResponse.json({ error: "action, ticker, and shares > 0 required" }, { status: 400 });
  }

  const player = await db.player.findFirst({
    where: { ticker: { equals: ticker.toUpperCase() } },
    select: { id: true, name: true, ticker: true, currentPrice: true },
  });

  if (!player) return NextResponse.json({ error: `Ticker ${ticker.toUpperCase()} not found` }, { status: 404 });
  if (!player.currentPrice) return NextResponse.json({ error: "Player has no price" }, { status: 400 });

  const execPrice = debug && limitPrice && limitPrice > 0 ? limitPrice : player.currentPrice;
  const total = execPrice * shares;

  const user = await db.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "buy") {
    if (user.balance < total) {
      return NextResponse.json({ error: `Insufficient balance ($${user.balance.toFixed(2)} available)` }, { status: 400 });
    }

    const existing = await db.userPosition.findUnique({
      where: { userId_playerId: { userId, playerId: player.id } },
    });

    const newShares = (existing?.shares ?? 0) + shares;
    const newAvg = existing
      ? (existing.avgBuyPrice * existing.shares + total) / newShares
      : execPrice;

    await db.$transaction([
      db.userTransaction.create({
        data: { userId, playerId: player.id, type: "buy", shares, price: execPrice, total },
      }),
      db.user.update({ where: { id: userId }, data: { balance: { decrement: total } } }),
      existing
        ? db.userPosition.update({
            where: { userId_playerId: { userId, playerId: player.id } },
            data: { shares: newShares, avgBuyPrice: newAvg },
          })
        : db.userPosition.create({
            data: { userId, playerId: player.id, shares, avgBuyPrice: execPrice },
          }),
    ]);

    const balanceAfter = user.balance - total;
    return NextResponse.json({ success: true, action: "buy", playerName: player.name, shares, price: execPrice, total, balanceAfter });
  }

  if (action === "sell") {
    const position = await db.userPosition.findUnique({
      where: { userId_playerId: { userId, playerId: player.id } },
    });

    if (!position) return NextResponse.json({ error: `No position in ${ticker.toUpperCase()}` }, { status: 400 });
    if (shares > position.shares) {
      return NextResponse.json({ error: `Only ${position.shares} shares available` }, { status: 400 });
    }

    const remaining = position.shares - shares;

    await db.$transaction([
      db.userTransaction.create({
        data: { userId, playerId: player.id, type: "sell", shares, price: execPrice, total },
      }),
      db.user.update({ where: { id: userId }, data: { balance: { increment: total } } }),
      remaining > 0
        ? db.userPosition.update({
            where: { userId_playerId: { userId, playerId: player.id } },
            data: { shares: remaining },
          })
        : db.userPosition.delete({
            where: { userId_playerId: { userId, playerId: player.id } },
          }),
    ]);

    const balanceAfter = user.balance + total;
    return NextResponse.json({ success: true, action: "sell", playerName: player.name, shares, price: execPrice, total, balanceAfter });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
