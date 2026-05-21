// Seed a demo user + friends with positions AND transactions (so charts work)
// Run with: npm run db:seed-friends

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_EMAIL = "demo@nbastocks.app";
const DEMO_PASSWORD = "demo1234";

const FRIENDS = [
  { name: "Jordan Mercer",    email: "jordan@example.com" },
  { name: "Priya Nair",       email: "priya@example.com" },
  { name: "Caleb Washington", email: "caleb@example.com" },
  { name: "Sofia Reyes",      email: "sofia@example.com" },
  { name: "Marcus Bell",      email: "marcus@example.com" },
  { name: "Aisha Torres",     email: "aisha@example.com" },
  { name: "Devon Park",       email: "devon@example.com" },
  { name: "Leila Hassan",     email: "leila@example.com" },
  { name: "Tyler Brooks",     email: "tyler@example.com" },
  { name: "Nat Chen",         email: "nat@example.com" },
];

// Returns a Date that is `daysAgo` days before today, optionally jittered
function daysAgo(days: number, jitterDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days - randomInt(0, jitterDays));
  d.setHours(randomInt(9, 17), randomInt(0, 59), 0, 0);
  return d;
}

async function seedPositions(
  userId: string,
  players: { id: number; currentPrice: number | null }[],
  opts: { spreadDays: number; jitter: number }
) {
  // Wipe existing positions + transactions for a clean re-seed
  await db.userTransaction.deleteMany({ where: { userId } });
  await db.userPosition.deleteMany({ where: { userId } });

  for (const player of players) {
    const currentPrice = player.currentPrice!;

    // Spread buys: 1-3 tranches per player, each on a different day
    const tranches = randomInt(1, 3);
    let totalShares = 0;
    let totalSpent = 0;

    for (let t = 0; t < tranches; t++) {
      const daysBack = opts.spreadDays - t * randomInt(10, 30);
      const buyDate = daysAgo(Math.max(daysBack, 5), opts.jitter);
      const shares = randomBetween(2, 20);
      // Simulate historical price: ±30% from current
      const price = round2(currentPrice * randomBetween(0.7, 1.3));
      const total = round2(shares * price);

      await db.userTransaction.create({
        data: { userId, playerId: player.id, type: "buy", shares, price, total, createdAt: buyDate },
      });

      totalShares += shares;
      totalSpent += total;
    }

    const avgBuyPrice = round2(totalSpent / totalShares);

    await db.userPosition.create({
      data: { userId, playerId: player.id, shares: round2(totalShares), avgBuyPrice },
    });
  }
}

async function main() {
  const hashPw = (pw: string) => bcrypt.hash(pw, 12);

  // ── Players with prices ─────────────────────────────────────────────────────
  const players = await db.player.findMany({
    where: { currentPrice: { not: null } },
    select: { id: true, name: true, currentPrice: true },
    take: 80,
    orderBy: { currentPrice: "desc" },
  });

  if (players.length === 0) {
    console.error("No priced players found — run `npm run db:price` first.");
    process.exit(1);
  }

  // ── Demo user ───────────────────────────────────────────────────────────────
  const demo = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { name: "Demo User", email: DEMO_EMAIL, password: await hashPw(DEMO_PASSWORD), balance: 84_230 },
    update: {},
  });

  // Give demo 12 positions spread over 6 months so the chart has history
  const demoPlayers = shuffle(players).slice(0, 12);
  await seedPositions(demo.id, demoPlayers, { spreadDays: 180, jitter: 14 });
  console.log(`✓ Demo user: ${demo.email}  (password: ${DEMO_PASSWORD})`);
  console.log(`  ✓ ${demoPlayers.length} positions with chart history`);

  // ── Friends ─────────────────────────────────────────────────────────────────
  const friendHash = await hashPw("password123");
  const friendRecords = [];

  for (const f of FRIENDS) {
    const user = await db.user.upsert({
      where: { email: f.email },
      create: { name: f.name, email: f.email, password: friendHash, balance: randomBetween(10_000, 90_000) },
      update: {},
    });

    const positionCount = randomInt(3, 8);
    const picked = shuffle(players).slice(0, positionCount);
    await seedPositions(user.id, picked, { spreadDays: 120, jitter: 20 });

    friendRecords.push(user);
    console.log(`  ✓ ${f.name} (${positionCount} positions)`);
  }

  // ── Friendships: demo ↔ all friends ────────────────────────────────────────
  for (const friend of friendRecords) {
    await db.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: demo.id, addresseeId: friend.id } },
      create: { requesterId: demo.id, addresseeId: friend.id, status: "accepted" },
      update: { status: "accepted" },
    });
  }

  // ── Some cross-friendships between friends ─────────────────────────────────
  const pairs: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[8,9],[0,9],[4,8]];
  for (const [a, b] of pairs) {
    await db.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: friendRecords[a].id, addresseeId: friendRecords[b].id } },
      create: { requesterId: friendRecords[a].id, addresseeId: friendRecords[b].id, status: "accepted" },
      update: { status: "accepted" },
    });
  }

  // ── One pending incoming request to demo ────────────────────────────────────
  const stranger = await db.user.upsert({
    where: { email: "sam@example.com" },
    create: { name: "Sam Rivera", email: "sam@example.com", password: friendHash },
    update: {},
  });
  await db.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: stranger.id, addresseeId: demo.id } },
    create: { requesterId: stranger.id, addresseeId: demo.id, status: "pending" },
    update: {},
  });
  console.log(`  ✓ Pending request from ${stranger.name}`);

  console.log("\n✅  Done! Log in as:", DEMO_EMAIL, "/", DEMO_PASSWORD);
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function randomBetween(min: number, max: number) { return round2(Math.random() * (max - min) + min); }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
