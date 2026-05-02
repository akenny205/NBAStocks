import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPortfolio } from "@/lib/portfolio";
import { fmt } from "@/lib/format";
import { Navbar } from "@/app/components/Navbar";
import { PortfolioChart } from "@/app/components/PortfolioChart";
import { PositionCard } from "@/app/components/PositionCard";
import { EmptyPortfolio } from "@/app/components/EmptyPortfolio";
import { TransactionHistory } from "@/app/components/TransactionHistory";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolio = await getPortfolio(session.user.id);
  const hasPositions = portfolio.positions.length > 0;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {hasPositions ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-zinc-900 rounded-lg p-4">
                <p className="text-xs text-zinc-500 font-medium mb-1">Cash Balance</p>
                <p className="text-lg font-bold text-white">${fmt(portfolio.balance)}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4">
                <p className="text-xs text-zinc-500 font-medium mb-1">Positions Value</p>
                <p className="text-lg font-bold text-white">${fmt(portfolio.totalValue - portfolio.balance)}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4">
                <p className="text-xs text-zinc-500 font-medium mb-1">Total Value</p>
                <p className="text-lg font-bold text-white">${fmt(portfolio.totalValue)}</p>
              </div>
            </div>

            <p className="text-zinc-500 text-sm font-medium mb-2">Portfolio Value</p>

            <PortfolioChart
              chartData={portfolio.chartData}
              totalValue={portfolio.totalValue}
              gainLoss={portfolio.gainLoss}
              gainLossPct={portfolio.gainLossPct}
            />

            <div className="mt-10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-white">Positions</h2>
                <span className="text-xs text-zinc-500">{portfolio.positions.length} holdings</span>
              </div>
              <p className="text-xs text-zinc-600 mb-4">
                Total invested · ${fmt(portfolio.totalCost)}
              </p>
              {portfolio.positions.map((p) => (
                <PositionCard key={p.id} position={p} />
              ))}
            </div>

            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Recent Activity</h2>
                <a href="/transactions" className="text-xs text-orange-500 hover:text-orange-400">
                  View all →
                </a>
              </div>
              <TransactionHistory />
            </div>
          </>
        ) : (
          <EmptyPortfolio />
        )}
      </main>
    </div>
  );
}
