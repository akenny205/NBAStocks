import { Navbar } from "@/app/components/Navbar";

export const metadata = {
  title: "Terminal | NBAStocks",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <code className="block bg-zinc-950 border border-zinc-800/60 rounded-lg px-4 py-3 text-sm text-orange-400 font-mono whitespace-pre">
      {children}
    </code>
  );
}

const commands = [
  { cmd: "QUOTE <TICKER>", desc: "Get the current price of a player" },
  { cmd: "BUY <TICKER> <SHARES>", desc: "Market buy shares of a player" },
  { cmd: "SELL <TICKER> <SHARES>", desc: "Market sell shares of a player" },
  { cmd: "POSITIONS", desc: "Show all open positions with P&L" },
  { cmd: "BALANCE", desc: "Show your current cash balance" },
  { cmd: "TICKERS [query]", desc: "Browse all player tickers (requires local install)" },
  { cmd: "DEBUG ON / OFF", desc: "Enable limit orders at a specific price" },
  { cmd: "BUY <TICKER> <SHARES> @ <PRICE>", desc: "Limit buy (debug mode only)" },
  { cmd: "SELL <TICKER> <SHARES> @ <PRICE>", desc: "Limit sell (debug mode only)" },
  { cmd: "LOGOUT", desc: "Sign out and switch accounts" },
  { cmd: "HELP", desc: "Show available commands" },
  { cmd: "EXIT", desc: "Quit the terminal" },
];

export default function TerminalPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-white">Terminal Exchange</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Trade NBAStocks directly from your terminal using the official CLI.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Getting started */}
            <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-6">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Getting Started</h2>
              <p className="text-zinc-400 text-sm mb-4">
                No installation required — run it directly with{" "}
                <code className="text-orange-400 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">npx</code>.
                Requires Node.js v18 or later.
              </p>
              <div className="space-y-3">
                <CodeBlock>npx nbastocks https://nbastocks.vercel.app</CodeBlock>
                <p className="text-zinc-500 text-xs">or connect to a local dev server:</p>
                <CodeBlock>npx nbastocks http://localhost:3000</CodeBlock>
              </div>
              <p className="text-zinc-500 text-sm mt-4">
                You'll be prompted to log in with your NBAStocks email and password. Your session is saved locally so you won't need to re-authenticate each time.
              </p>
            </div>

            {/* Commands */}
            <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800/60">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Commands</h2>
              </div>
              <div className="divide-y divide-zinc-800/40">
                {commands.map((c, i) => (
                  <div key={i} className="flex gap-4 px-6 py-3 text-sm hover:bg-zinc-800/20 transition-colors">
                    <code className="text-orange-400 font-mono w-56 shrink-0 text-xs">{c.cmd}</code>
                    <span className="text-zinc-400 text-xs">{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Requirements</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  Node.js v18+
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  NBAStocks account
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-zinc-600 mb-2">Check your version:</p>
                <CodeBlock>node --version</CodeBlock>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Limitations</h2>
              <ul className="space-y-2.5 text-xs text-zinc-500">
                <li className="flex gap-2">
                  <span className="text-zinc-600 flex-shrink-0">·</span>
                  <span><code className="text-orange-400 font-mono">TICKERS</code> requires a local repo clone — reads from a local file not included with the npx package.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-600 flex-shrink-0">·</span>
                  <span>Limit orders only work in <code className="text-orange-400 font-mono">DEBUG ON</code> mode and are for testing only.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-600 flex-shrink-0">·</span>
                  <span>Password input requires a real terminal — some embedded shells may not hide characters.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-600 flex-shrink-0">·</span>
                  <span>Sessions are per-machine and per-server URL.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
