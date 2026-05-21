import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const userWithPositions = {
  select: {
    id: true,
    name: true,
    email: true,
    positions: {
      select: {
        shares: true,
        avgBuyPrice: true,
        player: { select: { currentPrice: true } },
      },
    },
  },
} as const;

function calcPL(positions: { shares: number; avgBuyPrice: number; player: { currentPrice: number | null } }[]) {
  let value = 0;
  let cost = 0;
  for (const p of positions) {
    const price = p.player.currentPrice ?? p.avgBuyPrice;
    value += price * p.shares;
    cost += p.avgBuyPrice * p.shares;
  }
  const gainLoss = Math.round((value - cost) * 100) / 100;
  const gainLossPct = cost > 0 ? Math.round((gainLoss / cost) * 10000) / 100 : 0;
  return { positionsValue: Math.round(value * 100) / 100, gainLoss, gainLossPct };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [accepted, incoming, outgoing] = await Promise.all([
    db.friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: {
        id: true,
        requesterId: true,
        requester: userWithPositions,
        addressee: userWithPositions,
      },
    }),

    db.friendship.findMany({
      where: { addresseeId: userId, status: "pending" },
      select: {
        id: true,
        requester: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    db.friendship.findMany({
      where: { requesterId: userId, status: "pending" },
      select: {
        id: true,
        addressee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const friends = accepted.map((f) => {
    const other = f.requesterId === userId ? f.addressee : f.requester;
    const { positionsValue, gainLoss, gainLossPct } = calcPL(other.positions);
    return {
      friendshipId: f.id,
      id: other.id,
      name: other.name,
      email: other.email,
      positionsCount: other.positions.length,
      positionsValue,
      gainLoss,
      gainLossPct,
    };
  });

  return NextResponse.json({
    friends,
    incoming: incoming.map((f) => ({ friendshipId: f.id, requester: f.requester })),
    outgoing: outgoing.map((f) => ({ friendshipId: f.id, addressee: f.addressee })),
  });
}
