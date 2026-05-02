"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/format";

type Props = {
  playerId: number;
  playerName: string;
  currentPrice: number;
};

export function BuyDialog({ playerId, playerName, currentPrice }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = shares * currentPrice;

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

      setShares(1);
      setIsOpen(false);
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
        className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition"
      >
        Buy
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-96 max-w-96">
            <h2 className="text-xl font-semibold text-white mb-4">Buy {playerName}</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400">Current Price</label>
                <p className="text-lg font-semibold text-white">${fmt(currentPrice)}</p>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">Shares</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={shares}
                  onChange={(e) => setShares(parseFloat(e.target.value) || 1)}
                  className="w-full bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:border-green-500 outline-none"
                />
              </div>

              <div className="border-t border-zinc-700 pt-4">
                <div className="flex justify-between mb-4">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-lg text-white font-semibold">${fmt(total)}</span>
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
                  onClick={handleBuy}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                >
                  {loading ? "Buying..." : "Buy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
