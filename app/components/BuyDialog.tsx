"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/format";
import { Modal } from "@/app/components/ui/Modal";

type Props = {
  playerId: number;
  playerName: string;
  currentPrice: number;
  fullWidth?: boolean;
};

export function BuyDialog({ playerId, playerName, currentPrice, fullWidth }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = shares * currentPrice;

  function handleClose() {
    setIsOpen(false);
    setError(null);
    setShares(1);
  }

  async function handleBuy() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, shares }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to buy");
      }
      handleClose();
      router.refresh();
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
        className={`font-semibold text-white bg-green-600 hover:bg-green-500 transition-colors rounded-lg ${
          fullWidth
            ? "w-full py-2.5 text-sm"
            : "text-xs px-3 py-1.5"
        }`}
      >
        Buy
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title={`Buy ${playerName}`}>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800/60 rounded-lg">
            <span className="text-sm text-zinc-500">Price per share</span>
            <span className="text-sm font-bold text-white tabular-nums">${fmt(currentPrice)}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1.5">Shares</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={shares}
              onChange={(e) => setShares(parseFloat(e.target.value) || 1)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <span className="text-sm text-zinc-400">Total cost</span>
            <span className="text-base font-bold text-green-400 tabular-nums">${fmt(total)}</span>
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
              onClick={handleBuy}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? "Buying..." : "Confirm Buy"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
