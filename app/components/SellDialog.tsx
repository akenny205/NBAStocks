"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";
import { Modal } from "@/app/components/ui/Modal";

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
  const isProfit = gainLoss >= 0;

  function handleClose() {
    setIsOpen(false);
    setError(null);
    setShares(maxShares);
  }

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
      handleClose();
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
        className="text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg font-medium transition-colors"
      >
        Sell
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title={`Sell ${playerName}`}>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800/60 rounded-lg">
            <span className="text-sm text-zinc-500">Price per share</span>
            <span className="text-sm font-bold text-white tabular-nums">${fmt(currentPrice)}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1.5">
              Shares <span className="text-zinc-600">({fmt(maxShares)} available)</span>
            </label>
            <input
              type="number"
              min="0.01"
              max={maxShares}
              step="0.01"
              value={shares}
              onChange={(e) => setShares(Math.min(parseFloat(e.target.value) || 0, maxShares))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <div className={`p-3 rounded-lg border space-y-2 ${
            isProfit ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
          }`}>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Sale proceeds</span>
              <span className="text-white font-semibold tabular-nums">${fmt(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Gain / loss</span>
              <span className={`font-semibold tabular-nums ${isProfit ? "text-green-400" : "text-red-400"}`}>
                {isProfit ? "+" : ""}${fmt(gainLoss)} ({gainLossPct.toFixed(1)}%)
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors border border-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSell}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? "Selling..." : "Confirm Sell"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
