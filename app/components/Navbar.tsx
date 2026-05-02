import { auth } from "@/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/format";
import Link from "next/link";

export async function Navbar() {
  const session = await auth();

  let balance = 0;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });
    balance = user?.balance ?? 0;
  }

  return (
    <nav className="border-b border-zinc-900 bg-black px-6 py-4 flex items-center justify-between">
      <span className="text-orange-500 font-bold text-xl tracking-tight">
        🏀 NBAStocks
      </span>

      <div className="flex items-center gap-6">
        <a href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Portfolio
        </a>
        <a href="/players" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Players
        </a>
        <a href="/transactions" className="text-sm text-zinc-400 hover:text-white transition-colors">
          History
        </a>
      </div>

      <Link
        href="/account"
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-900/50 transition-colors"
      >
        <div className="text-right">
          <div className="text-sm text-white font-medium">
            {session?.user?.name ?? session?.user?.email}
          </div>
          <div className="text-xs text-zinc-500">
            ${fmt(balance)}
          </div>
        </div>
      </Link>
    </nav>
  );
}
