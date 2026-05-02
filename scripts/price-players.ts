// Run with: npm run db:price
// Computes and stores currentPrice for every player from seeded game logs.
// Safe to re-run — idempotent. Run once after seeding, then nightly via sync.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { refreshAllPrices } from "../lib/pricing";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Computing player prices...");
  const updated = await refreshAllPrices(db);
  console.log(`✓ Updated prices for ${updated} players`);

  // Quick sanity check — show the top 10 most expensive players
  const top = await db.player.findMany({
    where: { currentPrice: { not: null } },
    orderBy: { currentPrice: "desc" },
    take: 10,
    select: { name: true, currentPrice: true, isActive: true },
  });

  console.log("\nTop 10 players by price:");
  for (const p of top) {
    console.log(`  ${p.name}: $${p.currentPrice?.toFixed(2)} ${p.isActive ? "" : "(retired)"}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
