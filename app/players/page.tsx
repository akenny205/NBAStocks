import { Navbar } from "@/app/components/Navbar";
import { PlayersClient } from "./_components/PlayersClient";

export const metadata = { title: "Players | NBAStocks" };

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <PlayersClient />
    </div>
  );
}
