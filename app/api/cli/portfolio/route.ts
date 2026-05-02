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

export async function GET(req: NextRequest) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { return await getPortfolio(userId); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

async function getPortfolio(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      positions: {
        select: {
          shares: true,
          avgBuyPrice: true,
          player: { select: { name: true, ticker: true, currentPrice: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const positions = user.positions.map((p) => {
    const currentPrice = p.player.currentPrice ?? 0;
    const currentValue = currentPrice * p.shares;
    const cost = p.avgBuyPrice * p.shares;
    const gainLoss = currentValue - cost;
    const gainLossPct = cost > 0 ? (gainLoss / cost) * 100 : 0;
    return {
      ticker: p.player.ticker ?? "?",
      playerName: p.player.name,
      shares: p.shares,
      avgBuyPrice: p.avgBuyPrice,
      currentPrice,
      gainLoss,
      gainLossPct,
    };
  });

  return NextResponse.json({ balance: user.balance, positions });
}
