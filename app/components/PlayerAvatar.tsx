"use client";

import Image from "next/image";
import { useState } from "react";

const SIZES = { sm: 32, md: 40, lg: 72 };

export function PlayerAvatar({
  playerId,
  playerName,
  size = "md",
}: {
  playerId: number;
  playerName: string;
  size?: "sm" | "md" | "lg";
}) {
  const [errored, setErrored] = useState(false);
  const px = SIZES[size];
  const initials = playerName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  if (errored) {
    return (
      <div
        style={{ width: px, height: px }}
        className="rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold flex items-center justify-center flex-shrink-0"
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      style={{ width: px, height: px }}
      className="rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/50 flex-shrink-0"
    >
      <Image
        src={`https://cdn.nba.com/headshots/nba/latest/260x190/${playerId}.png`}
        alt={playerName}
        width={px}
        height={px}
        className="object-cover object-top w-full h-full"
        onError={() => setErrored(true)}
        unoptimized
      />
    </div>
  );
}
