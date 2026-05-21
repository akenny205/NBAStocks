import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const myId = session.user.id;

  const target = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  });

  if (!target) return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  if (target.id === myId) return NextResponse.json({ error: "You can't add yourself" }, { status: 400 });

  // Check for any existing relationship in either direction
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: myId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: myId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") return NextResponse.json({ error: "Already friends" }, { status: 409 });
    return NextResponse.json({ error: "Request already pending" }, { status: 409 });
  }

  const friendship = await db.friendship.create({
    data: { requesterId: myId, addresseeId: target.id, status: "pending" },
  });

  return NextResponse.json({ friendshipId: friendship.id, addressee: target });
}
