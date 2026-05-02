import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/app/components/Navbar";
import { TransactionHistory } from "@/app/components/TransactionHistory";

export const metadata = {
  title: "Transaction History | NBAStocks",
};

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <p className="text-zinc-500 text-sm mt-2">All your buy and sell transactions</p>
        </div>

        <TransactionHistory />
      </main>
    </div>
  );
}
