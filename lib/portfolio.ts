import { db } from "@/lib/db";
import { round2 } from "@/lib/format";

const CHART_SEASONS_BACK = 3;

export type EnrichedPosition = {
  id: string;
  player: {
    id: number;
    name: string;
    isActive: boolean;
  };
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  cost: number;
  gainLoss: number;
  gainLossPct: number;
};

export type PortfolioData = {
  balance: number;
  positionsValue: number;
  positions: EnrichedPosition[];
  chartData: { date: string; value: number }[];
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPct: number;
};

const STARTING_BALANCE = 100_000;

export async function getPortfolio(userId: string): Promise<PortfolioData> {
  const currentYear = new Date().getFullYear();
  const minSeason = currentYear - CHART_SEASONS_BACK;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  if (!user) {
    return {
      balance: 0,
      positionsValue: 0,
      positions: [],
      chartData: [],
      totalValue: 0,
      totalCost: 0,
      gainLoss: 0,
      gainLossPct: 0,
    };
  }

  const [positions, transactions] = await Promise.all([
    db.userPosition.findMany({
      where: { userId },
      include: {
        player: {
          select: { id: true, name: true, isActive: true, currentPrice: true },
        },
      },
    }),
    db.userTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, playerId: true, type: true, shares: true, price: true },
    }),
  ]);

  const enriched: EnrichedPosition[] = positions.map((p) => {
    const currentPrice = p.player.currentPrice ?? p.avgBuyPrice;
    const currentValue = currentPrice * p.shares;
    const cost = p.avgBuyPrice * p.shares;
    const gainLoss = currentValue - cost;
    const gainLossPct = cost > 0 ? (gainLoss / cost) * 100 : 0;
    return {
      id: p.id,
      player: { id: p.player.id, name: p.player.name, isActive: p.player.isActive },
      shares: p.shares,
      avgBuyPrice: p.avgBuyPrice,
      currentPrice,
      currentValue: round2(currentValue),
      cost: round2(cost),
      gainLoss: round2(gainLoss),
      gainLossPct: round2(gainLossPct),
    };
  });

  const totalPositionValue = round2(enriched.reduce((s, p) => s + p.currentValue, 0));
  const totalValue = round2(user.balance + totalPositionValue);
  const totalCost = round2(enriched.reduce((s, p) => s + p.cost, 0));
  const gainLoss = round2(totalPositionValue - totalCost);
  const gainLossPct = totalCost > 0 ? round2((gainLoss / totalCost) * 100) : 0;

  if (transactions.length === 0) {
    return {
      balance: user.balance,
      positionsValue: totalPositionValue,
      positions: enriched,
      chartData: [],
      totalValue,
      totalCost,
      gainLoss,
      gainLossPct,
    };
  }

  // Fetch game logs for every player the user has ever traded (including sold positions)
  const allPlayerIds = [...new Set(transactions.map((tx) => tx.playerId))];
  const playerLogs = await db.player.findMany({
    where: { id: { in: allPlayerIds } },
    select: {
      id: true,
      gameLogs: {
        where: { stockPrice: { not: null }, season: { gte: minSeason } },
        orderBy: { gameDate: "asc" },
        select: { gameDate: true, stockPrice: true },
      },
    },
  });
  const gameLogMap = new Map(playerLogs.map((p) => [p.id, p.gameLogs]));

  // Chart date range: first transaction → today
  const today = new Date().toISOString().split("T")[0];
  const firstTxDate = transactions[0].createdAt.toISOString().split("T")[0];

  const allDatesSet = new Set<string>();
  allDatesSet.add(firstTxDate);
  allDatesSet.add(today);

  for (const tx of transactions) {
    allDatesSet.add(tx.createdAt.toISOString().split("T")[0]);
  }

  for (const [, logs] of gameLogMap) {
    for (const log of logs) {
      const logDate = log.gameDate.toISOString().split("T")[0];
      if (logDate >= firstTxDate && logDate <= today) {
        allDatesSet.add(logDate);
      }
    }
  }

  const allDates = Array.from(allDatesSet).sort();

  const chartData = allDates.map((dateStr) => {
    // Today: use actual current positions value (no cash)
    if (dateStr === today) {
      return { date: dateStr, value: totalPositionValue };
    }

    // Reconstruct holdings and cash as of this date
    const holdingsMap = new Map<number, { shares: number; totalSpent: number }>();
    let cashSpent = 0;

    for (const tx of transactions) {
      const txDate = tx.createdAt.toISOString().split("T")[0];
      if (txDate > dateStr) break;

      if (tx.type === "buy") {
        const current = holdingsMap.get(tx.playerId) ?? { shares: 0, totalSpent: 0 };
        current.shares += tx.shares;
        current.totalSpent += tx.price * tx.shares;
        holdingsMap.set(tx.playerId, current);
        cashSpent += tx.price * tx.shares;
      } else if (tx.type === "sell") {
        const current = holdingsMap.get(tx.playerId);
        if (current) {
          const avgPrice = current.totalSpent / current.shares;
          current.shares -= tx.shares;
          current.totalSpent = current.shares * avgPrice;
          if (current.shares > 0) holdingsMap.set(tx.playerId, current);
          else holdingsMap.delete(tx.playerId);
          cashSpent -= tx.price * tx.shares;
        }
      }
    }

    const cashRemaining = STARTING_BALANCE - cashSpent;

    let positionValue = 0;
    for (const [playerId, holding] of holdingsMap) {
      const logs = gameLogMap.get(playerId) ?? [];
      let lastPrice = holding.totalSpent / holding.shares;
      for (const log of logs) {
        const logDate = log.gameDate.toISOString().split("T")[0];
        if (logDate <= dateStr) lastPrice = log.stockPrice ?? lastPrice;
        else break;
      }
      positionValue += lastPrice * holding.shares;
    }

    return { date: dateStr, value: round2(positionValue) };
  });

  return {
    balance: user.balance,
    positionsValue: totalPositionValue,
    positions: enriched,
    chartData,
    totalValue,
    totalCost,
    gainLoss,
    gainLossPct,
  };
}
