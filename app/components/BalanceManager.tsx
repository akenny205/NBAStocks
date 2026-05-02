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
    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Balance Shop</h2>

      <div className="mb-6 p-4 bg-zinc-900 rounded-lg">
        <p className="text-xs text-zinc-500 font-medium mb-1">Current Balance</p>
        <p className="text-2xl font-bold text-orange-500">${fmt(balance)}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-zinc-500 font-medium block mb-2">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleBalance("add")}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? "Processing..." : "Add Balance"}
          </button>
          <button
            onClick={() => handleBalance("withdraw")}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? "Processing..." : "Withdraw"}
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
      </div>
    </div>
  );
}
