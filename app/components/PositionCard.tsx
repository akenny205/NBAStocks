"use client";

import Link from "next/link";
import { fmt } from "@/lib/format";
import { SellDialog } from "./SellDialog";
import { useRouter } from "next/navigation";

type Position = {
  id: string;
  player: { id: number; name: string; isActive: boolean };
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
};

export function PositionCard({ position }: { position: Position }) {
  const { player, shares, currentPrice, currentValue, gainLoss, gainLossPct } = position;
  const isUp = gainLoss >= 0;
  const router = useRouter();

  return (
    <div className={`flex items-center gap-3 pl-0 pr-4 py-3 hover:bg-zinc-900/60 transition-colors border-l-2 ${
      isUp ? "border-l-green-500" : "border-l-red-500"
    }`}>
      <Link href={`/players/${player.id}`} className="flex-1 min-w-0 pl-4">
        <div className="text-sm font-semibold text-white truncate">{player.name}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {fmt(shares)} sh · <span className="text-zinc-400">${fmt(currentPrice)}</span>
        </div>
      </Link>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-white tabular-nums">${fmt(currentValue)}</div>
        <span className={`inline-block text-xs font-bold tabular-nums px-1.5 py-0.5 rounded mt-0.5 ${
          isUp
            ? "bg-green-500/15 text-green-400"
            : "bg-red-500/15 text-red-400"
        }`}>
          {isUp ? "+" : ""}{gainLossPct.toFixed(2)}%
        </span>
      </div>

      <SellDialog
        positionId={position.id}
        playerName={player.name}
        shares={shares}
        currentPrice={currentPrice}
        avgBuyPrice={position.avgBuyPrice}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
