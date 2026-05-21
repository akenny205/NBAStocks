import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendshipId, action } = await req.json();
  if (!friendshipId || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const friendship = await db.friendship.findUnique({ where: { id: friendshipId } });

  if (!friendship || friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "accept") {
    await db.friendship.update({ where: { id: friendshipId }, data: { status: "accepted" } });
  } else {
    await db.friendship.delete({ where: { id: friendshipId } });
  }

  return NextResponse.json({ ok: true });
}
