import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playerId = parseInt(id);

  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      name: true,
      currentPrice: true,
      gameLogs: {
        where: { gameType: "regular", stockPrice: { not: null } },
        orderBy: { gameDate: "desc" },
        take: 20,
        select: {
          gameDate: true,
          stockPrice: true,
          pts: true,
          reb: true,
          ast: true,
          stl: true,
          blk: true,
          tov: true,
          win: true,
        },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (player.gameLogs.length < 3) {
    return NextResponse.json({ analysis: "Not enough game data to analyze a trend for this player." });
  }

  const rows = player.gameLogs
    .map((g) => {
      const date = g.gameDate.toISOString().split("T")[0];
      const price = g.stockPrice?.toFixed(1) ?? "—";
      const pts = g.pts ?? "—";
      const reb = g.reb ?? "—";
      const ast = g.ast ?? "—";
      const stl = g.stl ?? "—";
      const blk = g.blk ?? "—";
      const tov = g.tov ?? "—";
      const wl = g.win === true ? "W" : g.win === false ? "L" : "—";
      return `${date} | $${price} | ${pts}pts ${reb}reb ${ast}ast ${stl}stl ${blk}blk ${tov}tov | ${wl}`;
    })
    .join("\n");

  const userMessage = `Player: ${player.name} (current price: $${player.currentPrice?.toFixed(2) ?? "N/A"})

Recent regular season games (newest first):
Date       | Price  | Stats                                  | W/L
${rows}

Where is this stock trending and why?`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system:
        "You analyze NBA player stock prices in a fantasy stock simulation. Each game, a player's stock price is calculated as: pts + (reb × 1.2) + (ast × 1.5) + (stl × 3) + (blk × 3) − (tov × 1). Given a player's recent game-by-game data, write exactly 2–3 sentences describing the current price trend and what's driving it. Be concise and specific to the numbers.",
      messages: [{ role: "user", content: userMessage }],
    });

    const analysis =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: "Analysis unavailable. API credits may be exhausted." },
      { status: 503 }
    );
  }
}
