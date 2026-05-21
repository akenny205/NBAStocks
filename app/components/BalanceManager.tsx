"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";

type Props = {
  initialBalance: number;
};

export function BalanceManager({ initialBalance }: Props) {
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleBalance(action: "add" | "withdraw") {
    setError(null);
    setSuccess(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount: numAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update balance");
      }

      setBalance(data.newBalance);
      setSuccess(`${action === "add" ? "Added" : "Withdrew"} $${fmt(numAmount)}`);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Balance</h2>

      <div className="mb-5 p-4 bg-zinc-950 border border-zinc-800/60 rounded-lg">
        <p className="text-xs text-zinc-500 mb-1">Available Cash</p>
        <p className="text-2xl font-bold text-white tabular-nums">${fmt(balance)}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleBalance("add")}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 text-green-400 text-sm font-semibold rounded-lg transition-colors border border-green-500/20"
          >
            {loading ? "..." : "Deposit"}
          </button>
          <button
            onClick={() => handleBalance("withdraw")}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 text-sm font-semibold rounded-lg transition-colors border border-red-500/20"
          >
            {loading ? "..." : "Withdraw"}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{success}</p>
        )}
      </div>
    </div>
  );
}
