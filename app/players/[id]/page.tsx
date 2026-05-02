import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/app/components/Navbar";
import { PlayerChart } from "@/app/components/PlayerChart";
import { BuyDialog } from "@/app/components/BuyDialog";
import { fmt } from "@/lib/format";
import { TrendAnalysis } from "@/app/components/TrendAnalysis";

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

type StatBoxProps = { label: string; value: string | number | null };
function StatBox({ label, value }: StatBoxProps) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 text-center">
      <div className="text-lg font-bold text-white">{value ?? "—"}</div>
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

  // Career and current season averages
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

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{player.name}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  player.isActive
                    ? "bg-green-500/10 text-green-400"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {player.isActive ? "Active" : "Retired"}
              </span>
            </div>
            {player.currentPrice && (
              <BuyDialog
                playerId={player.id}
                playerName={player.name}
                currentPrice={player.currentPrice}
              />
            )}
          </div>
          <p className="text-zinc-500 text-sm">{logs.length} games in database</p>
        </div>

        {/* Chart */}
        {logs.length > 0 ? (
          <PlayerChart
            data={logs}
            currentPrice={player.currentPrice ?? 0}
            playerName={player.name}
          />
        ) : (
          <div className="h-56 flex items-center justify-center text-zinc-600 text-sm">
            No game data available
          </div>
        )}

        {/* Stats grid */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            {currentSeason - 1}–{String(currentSeason).slice(2)} Season
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="PTS" value={avg(currentSeasonLogs, "pts")} />
            <StatBox label="REB" value={avg(currentSeasonLogs, "reb")} />
            <StatBox label="AST" value={avg(currentSeasonLogs, "ast")} />
            <StatBox label="STL" value={avg(currentSeasonLogs, "stl")} />
            <StatBox label="BLK" value={avg(currentSeasonLogs, "blk")} />
            <StatBox label="TOV" value={avg(currentSeasonLogs, "tov")} />
          </div>

          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider pt-2">
            Price Stats
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Current Price" value={player.currentPrice ? `$${fmt(player.currentPrice)}` : "—"} />
            <StatBox label="Season Avg" value={currentSeasonAvgPrice ? `$${fmt(currentSeasonAvgPrice)}` : "—"} />
            <StatBox label="Career High" value={careerHigh > 0 ? `$${fmt(careerHigh)}` : "—"} />
            <StatBox label="Career Games" value={careerLogs.length} />
            <StatBox label="Career PTS" value={avg(careerLogs, "pts")} />
            <StatBox label="Career Avg Price" value={
              careerLogs.length > 0
                ? `$${fmt(careerLogs.reduce((s, g) => s + g.stockPrice!, 0) / careerLogs.length)}`
                : "—"
            } />
          </div>
        </div>

        <TrendAnalysis playerId={player.id} playerName={player.name} />
      </main>
    </div>
  );
}
