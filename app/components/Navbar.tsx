import { auth } from "@/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/format";
import Link from "next/link";
import { NavLinks } from "./NavLinks";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = name ?? email ?? "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

export async function Navbar() {
  const session = await auth();
  const initials = getInitials(session?.user?.name, session?.user?.email);

  let balance = 0;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });
    balance = user?.balance ?? 0;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex h-14 items-center gap-4 px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-2 flex-shrink-0 group">
          <span className="text-xl leading-none">🏀</span>
          <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
            NBAStocks
          </span>
        </Link>

        {/* Nav links */}
        <NavLinks />

        <div className="flex-1" />

        {/* Balance chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <span className="text-xs text-zinc-500">Balance</span>
          <span className="text-sm font-semibold text-white tabular-nums">${fmt(balance)}</span>
        </div>

        {/* User avatar */}
        <Link
          href="/account"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/25 transition-colors flex-shrink-0"
          title="Account"
        >
          {initials}
        </Link>

      </div>
    </header>
  );
}
