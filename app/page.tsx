import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPortfolio } from "@/lib/portfolio";
import { fmt } from "@/lib/format";
import Link from "next/link";
import { Navbar } from "@/app/components/Navbar";
import { PortfolioChart } from "@/app/components/PortfolioChart";
import { PositionCard } from "@/app/components/PositionCard";
import { EmptyPortfolio } from "@/app/components/EmptyPortfolio";
import { TransactionHistory } from "@/app/components/TransactionHistory";
import { DiscoverSection } from "@/app/components/DiscoverSection";

const SIDEBAR_LIMIT = 5;

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolio = await getPortfolio(session.user.id);
  const hasPositions = portfolio.positions.length > 0;

  const visiblePositions = portfolio.positions.slice(0, SIDEBAR_LIMIT);
  const extraPositions = portfolio.positions.length - SIDEBAR_LIMIT;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {hasPositions ? (
          <div className="grid lg:grid-cols-5 gap-10 items-start">
            {/* Left: chart + discover cards directly below */}
            <div className="lg:col-span-3 space-y-10">
              <PortfolioChart
                chartData={portfolio.chartData}
                positionsValue={portfolio.positionsValue}
                balance={portfolio.balance}
                gainLoss={portfolio.gainLoss}
                gainLossPct={portfolio.gainLossPct}
              />
              <DiscoverSection embedded />
            </div>

            {/* Right sidebar: positions (5 max) + recent activity (5 max) */}
            <div className="lg:col-span-2 space-y-5 pt-2">
              {/* Positions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Positions · {portfolio.positions.length}
                  </h2>
                  <span className="text-xs text-zinc-600">${fmt(portfolio.totalCost)} in</span>
                </div>
                <div className="border border-zinc-800/50 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
                  {visiblePositions.map((p) => (
                    <PositionCard key={p.id} position={p} />
                  ))}
                  {extraPositions > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-zinc-500">
                        +{extraPositions} more position{extraPositions !== 1 ? "s" : ""}
                      </span>
                      <Link
                        href="/players"
                        className="text-xs text-orange-500 font-semibold hover:text-orange-400 transition-colors"
                      >
                        Browse all →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Recent Activity
                  </h2>
                  <Link href="/transactions" className="text-xs text-orange-500 hover:text-orange-400 transition-colors">
                    View all →
                  </Link>
                </div>
                <TransactionHistory limit={SIDEBAR_LIMIT} showViewAll />
              </div>
            </div>
          </div>
        ) : (
          <>
            <EmptyPortfolio />
            <DiscoverSection />
          </>
        )}
      </main>
    </div>
  );
}
