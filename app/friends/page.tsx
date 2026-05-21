import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/app/components/Navbar";
import { FriendsClient } from "./_components/FriendsClient";

export const metadata = { title: "Friends | NBAStocks" };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Friends</h1>
          <p className="text-zinc-500 text-sm mt-1">See where your friends have their money</p>
        </div>
        <FriendsClient />
      </main>
    </div>
  );
}
