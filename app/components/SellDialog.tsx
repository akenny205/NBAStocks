"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";

type Props = {
  positionId: string;
  playerName: string;
  shares: number;
  currentPrice: number;
  avgBuyPrice: number;
  onSuccess?: () => void;
};

export function SellDialog({
  positionId,
  playerName,
  shares: maxShares,
  currentPrice,
  avgBuyPrice,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState<number>(maxShares);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = shares * currentPrice;
  const gainLoss = (currentPrice - avgBuyPrice) * shares;
  const gainLossPct = ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;

  async function handleSell() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/transactions/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, shares }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sell");
      }

      setIsOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition"
      >
        Sell
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-96 max-w-96">
            <h2 className="text-xl font-semibold text-white mb-4">Sell {playerName}</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400">Current Price</label>
                <p className="text-lg font-semibold text-white">${fmt(currentPrice)}</p>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">
                  Shares ({Math.floor(maxShares)} available)
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={maxShares}
                  step="0.01"
                  value={shares}
                  onChange={(e) => setShares(Math.min(parseFloat(e.target.value) || 0, maxShares))}
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:border-red-500 outline-none"
                />
              </div>

              <div className="border-t border-zinc-700 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Sale Proceeds</span>
                  <span className="text-white font-semibold">${fmt(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Gain/Loss per share</span>
                  <span className={gainLoss >= 0 ? "text-green-500" : "text-red-500"}>
                    ${fmt(currentPrice - avgBuyPrice)} ({gainLossPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total Gain/Loss</span>
                  <span className={gainLoss >= 0 ? "text-green-500" : "text-red-500"}>
                    ${fmt(gainLoss)}
                  </span>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSell}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                >
                  {loading ? "Selling..." : "Sell"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
