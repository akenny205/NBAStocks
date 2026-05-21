import Link from "next/link";
import { db } from "@/lib/db";
import { fmt } from "@/lib/format";

async function getBestPerformer() {
  const latest = await db.gameLog.findFirst({
    where: { stockPrice: { not: null } },
    orderBy: { gameDate: "desc" },
    select: { gameDate: true },
  });
  if (!latest) return null;
  return db.gameLog.findFirst({
    where: { gameDate: latest.gameDate, stockPrice: { not: null } },
    orderBy: { stockPrice: "desc" },
    select: {
      stockPrice: true,
      pts: true, reb: true, ast: true, stl: true, blk: true,
      gameDate: true,
      player: { select: { id: true, name: true } },
    },
  });
}

// ── Card primitives ───────────────────────────────────────────────────────────

function CardShell({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${className}`}
    >
      {children}
    </Link>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export async function DiscoverSection({ embedded = false }: { embedded?: boolean }) {
  const best = await getBestPerformer();

  const gameDate = best?.gameDate
    ? new Date(best.gameDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  // embedded = inside the left column (3/5 width) → 2-col grid
  // standalone = full width below → 4-col grid on large screens
  const gridCls = embedded
    ? "grid grid-cols-2 gap-4"
    : "grid grid-cols-2 lg:grid-cols-4 gap-4";

  return (
    <section className={embedded ? "" : "mt-14"}>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-5">Discover</p>

      <div className={`${gridCls} auto-rows-fr`}>

        {/* Best Performer — spans 2 cols, taller */}
        {best ? (
          <CardShell
            href={`/players/${best.player.id}`}
            className="col-span-2 row-span-2 bg-gradient-to-br from-green-950 via-zinc-900 to-zinc-900 border-green-800/30"
          >
            <div className="flex flex-col justify-between h-full p-6 min-h-[220px]">
              <div>
                <Tag label="Top of the day" color="bg-green-500/20 text-green-400" />
                <p className="mt-4 text-3xl font-extrabold text-white leading-tight">
                  {best.player.name}
                </p>
                <p className="text-green-400 text-4xl font-black tabular-nums mt-1">
                  {best.stockPrice?.toFixed(0)}
                  <span className="text-lg font-semibold text-green-600 ml-1">pts</span>
                </p>
              </div>
              <div>
                <div className="flex gap-4 mt-6 text-sm">
                  {[
                    { label: "PTS", val: best.pts },
                    { label: "REB", val: best.reb },
                    { label: "AST", val: best.ast },
                    { label: "STL", val: best.stl },
                    { label: "BLK", val: best.blk },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-xs text-zinc-500">{label}</p>
                      <p className="font-bold text-white tabular-nums">{val ?? "—"}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-4">{gameDate} · View player page →</p>
              </div>
            </div>
          </CardShell>
        ) : (
          <CardShell href="/players" className="col-span-2 row-span-2 bg-zinc-900 border-zinc-800/50">
            <div className="flex flex-col justify-center items-center h-full p-6 min-h-[220px] text-zinc-600 text-sm">
              No recent game data
            </div>
          </CardShell>
        )}

        {/* How prices work */}
        <CardShell href="/players" className="bg-zinc-900 border-blue-900/40">
          <div className="p-5 flex flex-col gap-3 h-full">
            <Tag label="Algorithm" color="bg-blue-500/15 text-blue-400" />
            <p className="text-base font-bold text-white leading-snug">How stock prices are calculated</p>
            <p className="font-mono text-[11px] text-zinc-400 leading-relaxed mt-auto">
              PTS<br />
              + REB × 1.2<br />
              + AST × 1.5<br />
              + STL × 3<br />
              + BLK × 3<br />
              − TOV
            </p>
          </div>
        </CardShell>

        {/* $100k game */}
        <CardShell href="/account" className="bg-zinc-900 border-orange-900/40">
          <div className="p-5 flex flex-col gap-3 h-full">
            <Tag label="The Game" color="bg-orange-500/15 text-orange-400" />
            <p className="text-base font-bold text-white leading-snug">Everyone starts with $100,000</p>
            <p className="text-3xl font-black text-orange-500 tabular-nums mt-auto">$100k</p>
          </div>
        </CardShell>

        {/* Terminal */}
        <CardShell href="/terminal" className="bg-zinc-900 border-zinc-700/50">
          <div className="p-5 flex flex-col gap-3 h-full">
            <Tag label="CLI" color="bg-zinc-700 text-zinc-300" />
            <p className="text-base font-bold text-white leading-snug">Trade from your terminal</p>
            <div className="mt-auto font-mono text-[11px] text-orange-400 bg-zinc-950 rounded-lg px-3 py-2 leading-relaxed">
              <span className="text-zinc-600">$ </span>npx nbastocks<br />
              <span className="text-zinc-600">&gt; </span>BUY SGA 10<br />
              <span className="text-green-400">  Bought 10 shares ✓</span>
            </div>
          </div>
        </CardShell>

        {/* Compare players */}
        <CardShell href="/players" className="bg-zinc-900 border-zinc-800/50">
          <div className="p-5 flex flex-col gap-3 h-full">
            <Tag label="Explore" color="bg-zinc-700 text-zinc-300" />
            <p className="text-base font-bold text-white leading-snug">Compare players side by side</p>
            <div className="mt-auto flex gap-1">
              {["#22c55e", "#f97316", "#3b82f6", "#a855f7"].map((c, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full opacity-80" style={{ background: c }} />
              ))}
            </div>
            <p className="text-xs text-zinc-500">Overlay price charts for up to 8 players</p>
          </div>
        </CardShell>

        {/* AI Trend Analysis */}
        <CardShell href="/players" className="bg-gradient-to-br from-purple-950/60 to-zinc-900 border-purple-800/30">
          <div className="p-5 flex flex-col gap-3 h-full">
            <Tag label="AI" color="bg-purple-500/20 text-purple-400" />
            <p className="text-base font-bold text-white leading-snug">AI trend analysis on every player</p>
            <p className="text-xs text-zinc-500 mt-auto">
              Ask an LLM where a player&apos;s stock is heading based on recent game log data.
            </p>
          </div>
        </CardShell>

        {/* Friends */}
        <CardShell href="/friends" className="bg-zinc-900 border-zinc-800/50">
          <div className="p-5 flex flex-col gap-3 h-full">
            <Tag label="Social" color="bg-zinc-700 text-zinc-300" />
            <p className="text-base font-bold text-white leading-snug">See where your friends have their money</p>
            <div className="mt-auto flex -space-x-2">
              {["JM", "PN", "CW", "SR", "MB"].map((init) => (
                <div key={init} className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-bold flex items-center justify-center">
                  {init}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 text-[10px] font-bold flex items-center justify-center">
                +
              </div>
            </div>
          </div>
        </CardShell>

        {/* Transaction history */}
        <CardShell href="/transactions" className="bg-zinc-900 border-zinc-800/50">
          <div className="p-5 flex flex-col gap-3 h-full">
            <Tag label="History" color="bg-zinc-700 text-zinc-300" />
            <p className="text-base font-bold text-white leading-snug">Full transaction history</p>
            <div className="mt-auto space-y-1.5">
              {[
                { type: "BUY", name: "LeBron James", color: "text-green-400 bg-green-500/10" },
                { type: "SELL", name: "Stephen Curry", color: "text-red-400 bg-red-500/10" },
                { type: "BUY", name: "Kevin Durant", color: "text-green-400 bg-green-500/10" },
              ].map((row) => (
                <div key={row.name} className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.color}`}>{row.type}</span>
                  <span className="text-xs text-zinc-500 truncate">{row.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardShell>

      </div>
    </section>
  );
}
