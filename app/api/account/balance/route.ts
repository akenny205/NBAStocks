import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, amount } = await req.json();

    if (!action || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (action !== "add" && action !== "withdraw") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "withdraw" && user.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const newBalance = action === "add" ? user.balance + amount : user.balance - amount;

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { balance: newBalance },
      select: { balance: true },
    });

    return NextResponse.json({ success: true, newBalance: updated.balance });
  } catch (error) {
    console.error("Balance update error:", error);
    return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
  }
}
