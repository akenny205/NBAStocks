"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export function TransactionHistory({ limit, showViewAll }: { limit?: number; showViewAll?: boolean }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions/history")
      .then((r) => r.json())
      .then((data) => { setTransactions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border border-zinc-800/50 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-zinc-900/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const displayed = limit ? transactions.slice(0, limit) : transactions;

  if (displayed.length === 0) {
    return (
      <div className="border border-zinc-800/50 rounded-xl px-6 py-10 text-center">
        <p className="text-zinc-600 text-sm">No transactions yet</p>
      </div>
    );
  }

  const hasMore = limit !== undefined && transactions.length > limit;

  return (
    <div className="border border-zinc-800/50 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
      {displayed.map((tx) => {
        const isBuy = tx.type === "buy";
        return (
          <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/60 transition-colors">
            <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-wider flex-shrink-0 ${
              isBuy
                ? "bg-green-500/15 text-green-400 border border-green-500/20"
                : "bg-red-500/15 text-red-400 border border-red-500/20"
            }`}>
              {isBuy ? "BUY" : "SELL"}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                <Link href={`/players/${tx.player.id}`} className="hover:text-zinc-300 transition-colors">
                  {tx.player.name}
                </Link>
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {fmt(tx.shares)} sh · ${fmt(tx.price)} · {new Date(tx.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className={`text-sm font-bold tabular-nums flex-shrink-0 ${isBuy ? "text-red-400" : "text-green-400"}`}>
              {isBuy ? "−" : "+"}${fmt(tx.total)}
            </div>
          </div>
        );
      })}
      {showViewAll && hasMore && (
        <Link
          href="/transactions"
          className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900/60 transition-colors"
        >
          <span className="text-sm text-zinc-500">
            +{transactions.length - displayed.length} more transactions
          </span>
          <span className="text-xs text-orange-500 font-semibold">View all →</span>
        </Link>
      )}
    </div>
  );
}
