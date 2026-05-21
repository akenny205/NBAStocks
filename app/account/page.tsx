import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/app/components/Navbar";
import { BalanceManager } from "@/app/components/BalanceManager";

export const metadata = { title: "Account | NBAStocks" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, balance: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Account</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your profile and balance</p>
        </div>

        <div className="grid gap-4 max-w-xl">
          {/* Account Info */}
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Name</p>
                <p className="text-white text-sm">{user.name ?? <span className="text-zinc-600">Not set</span>}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Email</p>
                <p className="text-white text-sm">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Balance */}
          <BalanceManager initialBalance={user.balance} />

          {/* Sign out */}
          <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Session</h2>
            <p className="text-zinc-500 text-sm mb-4">
              You will be signed out and redirected to the login page.
            </p>
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors border border-zinc-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
