import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/app/components/Navbar";
import { BalanceManager } from "@/app/components/BalanceManager";

export const metadata = {
  title: "Account Settings | NBAStocks",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, balance: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-zinc-500 text-sm mt-2">Manage your account preferences</p>
        </div>

        {/* Account Info */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 font-medium">Name</p>
              <p className="text-white">{user.name ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Balance Shop */}
        <div className="mb-6">
          <BalanceManager initialBalance={user.balance} />
        </div>

        {/* Sign Out */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Sign Out</h2>
          <p className="text-zinc-400 text-sm mb-4">
            You will be logged out and redirected to the login page.
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
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
