"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";

type Transaction = {
  id: string;
  type: "buy" | "sell";
  playerId: number;
  shares: number;
  price: number;
  total: number;
  createdAt: string;
  player: { id: number; name: string };
};

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions/history")
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-zinc-500 text-sm py-8">Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return <div className="text-zinc-500 text-sm py-8">No transaction history yet</div>;
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isBuy = tx.type === "buy";
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between py-3 px-3 bg-zinc-900/50 rounded hover:bg-zinc-900 transition"
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isBuy ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"
                }`}
              >
                {isBuy ? "+" : "-"}
              </div>
              <div>
                <p className="text-sm text-white font-medium">
                  {isBuy ? "Bought" : "Sold"} {fmt(tx.shares)} shares of {tx.player.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(tx.createdAt).toLocaleDateString()} at {fmt(tx.price)}/share
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${isBuy ? "text-red-400" : "text-green-400"}`}>
                {isBuy ? "-" : "+"}${fmt(tx.total)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
