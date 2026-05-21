"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Portfolio" },
  { href: "/players", label: "Players" },
  { href: "/friends", label: "Friends" },
  { href: "/transactions", label: "History" },
  { href: "/terminal", label: "Terminal" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-0.5">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active
                ? "text-orange-400 bg-orange-500/10"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
