import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/app/components/Navbar";
import { PlayerChart } from "@/app/components/PlayerChart";
import { BuyDialog } from "@/app/components/BuyDialog";
import { fmt } from "@/lib/format";
import { TrendAnalysis } from "@/app/components/TrendAnalysis";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

async function getPlayerWithLogs(id: number) {
  const player = await db.player.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isActive: true,
      currentPrice: true,
      priceUpdatedAt: true,
      gameLogs: {
        where: { stockPrice: { not: null } },
        orderBy: { gameDate: "asc" },
        select: {
          gameDate: true,
          stockPrice: true,
          pts: true,
          reb: true,
          ast: true,
          stl: true,
          blk: true,
          tov: true,
          gameType: true,
          win: true,
          season: true,
        },
      },
    },
  });
  return player;
}

type StatBoxProps = { label: string; value: string | number | null; accent?: "green" | "red" | "orange" };
function StatBox({ label, value, accent }: StatBoxProps) {
  const valueColor = accent === "green"
    ? "text-green-400"
    : accent === "red"
    ? "text-red-400"
    : accent === "orange"
    ? "text-orange-400"
    : "text-white";

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 text-center">
      <div className={`text-lg font-bold tabular-nums ${valueColor}`}>{value ?? "—"}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const player = await getPlayerWithLogs(parseInt(id));
  if (!player) notFound();

  const logs = player.gameLogs.map((g) => ({
    date: g.gameDate.toISOString().split("T")[0],
    stockPrice: g.stockPrice!,
    pts: g.pts,
    reb: g.reb,
    ast: g.ast,
    stl: g.stl,
    blk: g.blk,
    tov: g.tov,
    gameType: g.gameType,
    win: g.win,
  }));

  const currentSeason = 2025;
  const currentSeasonLogs = player.gameLogs.filter(
    (g) => g.season === currentSeason && g.gameType === "regular"
  );
  const careerLogs = player.gameLogs.filter((g) => g.gameType === "regular");

  function avg(logs: typeof careerLogs, key: keyof typeof careerLogs[0]): string {
    const valid = logs.filter((g) => g[key] !== null);
    if (valid.length === 0) return "—";
    const sum = valid.reduce((s, g) => s + (g[key] as number), 0);
    return (sum / valid.length).toFixed(1);
  }

  const currentSeasonAvgPrice =
    currentSeasonLogs.length > 0
      ? currentSeasonLogs.reduce((s, g) => s + g.stockPrice!, 0) / currentSeasonLogs.length
      : null;

  const careerHigh = player.gameLogs.reduce(
    (max, g) => (g.stockPrice! > max ? g.stockPrice! : max),
    0
  );

  const careerAvgPrice =
    careerLogs.length > 0
      ? careerLogs.reduce((s, g) => s + g.stockPrice!, 0) / careerLogs.length
      : null;

  const priceVsAvg =
    player.currentPrice && currentSeasonAvgPrice
      ? ((player.currentPrice - currentSeasonAvgPrice) / currentSeasonAvgPrice) * 100
      : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <PlayerAvatar playerId={player.id} playerName={player.name} size="lg" />
          <h1 className="text-2xl font-bold text-white">{player.name}</h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              player.isActive
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}
          >
            {player.isActive ? "● Active" : "Retired"}
          </span>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: chart + stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            {logs.length > 0 ? (
              <PlayerChart
                data={logs}
                currentPrice={player.currentPrice ?? 0}
                playerName={player.name}
              />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl h-56 flex items-center justify-center text-zinc-600 text-sm">
                No game data available
              </div>
            )}

            {/* Season stats */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                {currentSeason - 1}–{String(currentSeason).slice(2)} Season Averages
              </p>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Points" value={avg(currentSeasonLogs, "pts")} accent="orange" />
                <StatBox label="Rebounds" value={avg(currentSeasonLogs, "reb")} />
                <StatBox label="Assists" value={avg(currentSeasonLogs, "ast")} />
                <StatBox label="Steals" value={avg(currentSeasonLogs, "stl")} />
                <StatBox label="Blocks" value={avg(currentSeasonLogs, "blk")} />
                <StatBox label="Turnovers" value={avg(currentSeasonLogs, "tov")} accent="red" />
              </div>
            </div>

            {/* Career */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Career
              </p>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Games" value={careerLogs.length} />
                <StatBox label="Avg Points" value={avg(careerLogs, "pts")} accent="orange" />
                <StatBox label="Avg Price" value={careerAvgPrice ? `$${fmt(careerAvgPrice)}` : "—"} />
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 sticky top-20 self-start">
            {/* Price card */}
            <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Market Price
              </p>
              {player.currentPrice ? (
                <>
                  <p className="text-3xl font-bold text-white tabular-nums mb-1">
                    ${fmt(player.currentPrice)}
                  </p>
                  {priceVsAvg !== null && (
                    <p className={`text-xs font-medium mb-5 ${priceVsAvg >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {priceVsAvg >= 0 ? "▲" : "▼"} {Math.abs(priceVsAvg).toFixed(1)}% vs season avg
                    </p>
                  )}
                  <BuyDialog
                    playerId={player.id}
                    playerName={player.name}
                    currentPrice={player.currentPrice}
                    fullWidth
                  />
                </>
              ) : (
                <p className="text-zinc-600 text-sm">No price data</p>
              )}

              <div className="mt-5 pt-4 border-t border-zinc-800/60 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Season avg</span>
                  <span className="text-white tabular-nums font-medium">
                    {currentSeasonAvgPrice ? `$${fmt(currentSeasonAvgPrice)}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Career high</span>
                  <span className="text-green-400 tabular-nums font-medium">
                    {careerHigh > 0 ? `$${fmt(careerHigh)}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Games tracked</span>
                  <span className="text-white tabular-nums font-medium">{logs.length}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <TrendAnalysis playerId={player.id} playerName={player.name} />
          </div>
        </div>
      </main>
    </div>
  );
}
