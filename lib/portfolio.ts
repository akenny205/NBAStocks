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
  positions: EnrichedPosition[];
  chartData: { date: string; value: number }[];
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPct: number;
};

export async function getPortfolio(userId: string): Promise<PortfolioData> {
  const currentSeason = new Date().getFullYear();
  const minSeason = currentSeason - CHART_SEASONS_BACK;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  if (!user) {
    return {
      balance: 0,
      positions: [],
      chartData: [],
      totalValue: 0,
      totalCost: 0,
      gainLoss: 0,
      gainLossPct: 0,
    };
  }

  const positions = await db.userPosition.findMany({
    where: { userId },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          isActive: true,
          currentPrice: true,
          gameLogs: {
            where: { stockPrice: { not: null }, season: { gte: minSeason } },
            orderBy: { gameDate: "asc" },
            select: { gameDate: true, stockPrice: true },
          },
        },
      },
    },
  });

  if (positions.length === 0) {
    return {
      balance: user.balance,
      positions: [],
      chartData: [],
      totalValue: user.balance,
      totalCost: 0,
      gainLoss: 0,
      gainLossPct: 0,
    };
  }

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

  // Get transactions to see when buys/sells happened
  const transactions = await db.userTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      playerId: true,
      type: true,
      shares: true,
      price: true,
    },
  });

  // Collect all unique dates: transaction dates + game log dates
  const allDatesSet = new Set<string>();

  // Add transaction dates
  for (const tx of transactions) {
    allDatesSet.add(tx.createdAt.toISOString().split("T")[0]);
  }

  // Add game log dates
  for (const p of positions) {
    for (const log of p.player.gameLogs) {
      allDatesSet.add(log.gameDate.toISOString().split("T")[0]);
    }
  }

  const allDates = Array.from(allDatesSet).sort();

  // Build chart data
  const chartData = allDates.map((dateStr) => {
    // Calculate holdings as of this date based on transactions up to this date
    const holdingsMap = new Map<number, { shares: number; totalSpent: number }>();
    let cashSpent = 0;

    for (const tx of transactions) {
      const txDate = tx.createdAt.toISOString().split("T")[0];
      if (txDate > dateStr) break; // Only count transactions up to this date

      if (tx.type === "buy") {
        const current = holdingsMap.get(tx.playerId) || { shares: 0, totalSpent: 0 };
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
          if (current.shares > 0) {
            holdingsMap.set(tx.playerId, current);
          } else {
            holdingsMap.delete(tx.playerId);
          }
          cashSpent -= tx.price * tx.shares;
        }
      }
    }

    const cashRemaining = 100000 - cashSpent;

    // Calculate position values using stock prices on or before this date
    let positionValue = 0;
    for (const [playerId, holding] of holdingsMap) {
      const position = positions.find((p) => p.player.id === playerId);
      if (position) {
        let lastPrice = holding.totalSpent / holding.shares; // Use average buy price as fallback
        for (const log of position.player.gameLogs) {
          const logDate = log.gameDate.toISOString().split("T")[0];
          if (logDate <= dateStr) lastPrice = log.stockPrice ?? lastPrice;
          else break;
        }
        positionValue += lastPrice * holding.shares;
      }
    }

    const totalValue = cashRemaining + positionValue;
    return { date: dateStr, value: round2(totalValue) };
  });

  const totalPositionValue = enriched.reduce((s, p) => s + p.currentValue, 0);
  const totalValue = user.balance + totalPositionValue;
  const totalCost = enriched.reduce((s, p) => s + p.cost, 0);
  const gainLoss = totalValue - (user.balance + totalCost);
  const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  return {
    balance: user.balance,
    positions: enriched,
    chartData,
    totalValue: round2(totalValue),
    totalCost: round2(totalCost),
    gainLoss: round2(gainLoss),
    gainLossPct: round2(gainLossPct),
  };
}
