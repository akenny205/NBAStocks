import "dotenv/config";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { ensureAllTickers, writeTickerMapFile } from "../lib/tickers";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const MAP_FILE = path.join(__dirname, "../data/tickers.json");

async function main() {
  console.log("Clearing all existing tickers...");
  await db.player.updateMany({ data: { ticker: null } });

  console.log("Assigning tickers to all players...");
  const assigned = await ensureAllTickers(db);
  console.log(`Assigned ${assigned} tickers.`);

  console.log("Writing data/tickers.json...");
  await writeTickerMapFile(db, MAP_FILE);
  console.log("Done.");

  // Show sample from active players
  const samples = await db.player.findMany({
    where: { isActive: true, ticker: { not: null } },
    select: { name: true, ticker: true },
    orderBy: { currentPrice: "desc" },
    take: 10,
  });
  console.log("\nSample tickers (top active players by price):");
  for (const p of samples) {
    console.log(`  ${p.ticker?.padEnd(6)} ${p.name}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
