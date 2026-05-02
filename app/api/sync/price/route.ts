import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshAllPrices } from "@/lib/pricing";

const SYNC_SECRET = process.env.SYNC_SECRET || "dev-secret";

export async function POST(req: NextRequest) {
  try {
    // Validate secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${SYNC_SECRET}` && req.nextUrl.searchParams.get("secret") !== SYNC_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[PRICE SYNC] Refreshing all player prices...");
    const updated = await refreshAllPrices(db);
    console.log(`[PRICE SYNC] Updated ${updated} players`);

    return NextResponse.json({
      success: true,
      playersUpdated: updated,
    });
  } catch (err) {
    console.error("[PRICE SYNC] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
