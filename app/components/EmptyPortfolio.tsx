"use client";

export function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="text-6xl">🏀</div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Your portfolio is empty</h2>
        <p className="text-zinc-500 text-sm mt-2">
          Browse players to start trading and build your portfolio.
        </p>
      </div>
      <a
        href="/players"
        className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-sm font-semibold rounded-full transition-colors"
      >
        Browse players
      </a>
    </div>
  );
}
