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

  function handleSellSuccess() {
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40 -mx-4 px-4 rounded-lg transition-colors">
      <Link href={`/players/${player.id}`} className="flex-1 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
          🏀
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{player.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {fmt(shares)} shares · {player.isActive ? "Active" : "Retired"}
          </div>
        </div>
      </Link>

      <div className="text-right mr-4 flex-1">
        <div className="text-sm font-semibold text-white">${fmt(currentValue)}</div>
        <div className={`text-xs mt-0.5 font-medium ${isUp ? "text-green-400" : "text-orange-400"}`}>
          {isUp ? "+" : ""}${fmt(gainLoss)} ({isUp ? "+" : ""}{gainLossPct.toFixed(2)}%)
        </div>
        <div className="text-xs text-zinc-600 mt-0.5">${fmt(currentPrice)}/pt</div>
      </div>

      <div className="flex gap-2">
        <SellDialog
          positionId={position.id}
          playerName={player.name}
          shares={shares}
          currentPrice={currentPrice}
          avgBuyPrice={position.avgBuyPrice}
          onSuccess={handleSellSuccess}
        />
      </div>
    </div>
  );
}
