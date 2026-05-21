"use client";

export function EmptyPortfolio() {
  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl">
        🏀
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-white">No positions yet</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Browse players and buy shares to start building your portfolio.
        </p>
      </div>
      <a
        href="/players"
        className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Browse players
      </a>
    </div>
  );
}
