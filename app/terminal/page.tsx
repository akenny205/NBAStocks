import { Navbar } from "@/app/components/Navbar";

export const metadata = {
  title: "Terminal | NBAStocks",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <code className="block bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-orange-400 font-mono whitespace-pre">
      {children}
    </code>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
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
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Terminal</h1>
          <p className="text-zinc-500 text-sm mt-2">
            Trade NBAStocks directly from your terminal using the official CLI.
          </p>
        </div>

        <Section title="Requirements">
          <p className="text-zinc-400 text-sm mb-3">
            Node.js v18 or later. No installation required — run it directly with <code className="text-orange-400 font-mono">npx</code>.
          </p>
          <p className="text-zinc-400 text-sm">
            Check your Node.js version:
          </p>
          <div className="mt-2">
            <CodeBlock>node --version</CodeBlock>
          </div>
        </Section>

        <Section title="Usage">
          <p className="text-zinc-400 text-sm mb-3">
            Run the CLI and point it at the exchange:
          </p>
          <CodeBlock>npx nbastocks https://nbastocks.vercel.app</CodeBlock>
          <p className="text-zinc-400 text-sm mt-4 mb-3">
            You'll be prompted to log in with your NBAStocks email and password. Your session is saved locally so you won't need to log in every time.
          </p>
          <p className="text-zinc-400 text-sm mb-2">
            To connect to a local dev server:
          </p>
          <CodeBlock>npx nbastocks http://localhost:3000</CodeBlock>
        </Section>

        <Section title="Commands">
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            {commands.map((c, i) => (
              <div
                key={i}
                className={`flex gap-4 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/40"}`}
              >
                <code className="text-orange-400 font-mono w-56 shrink-0">{c.cmd}</code>
                <span className="text-zinc-400">{c.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Limitations">
          <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
            <li>
              The <code className="text-orange-400 font-mono">TICKERS</code> command requires a local copy of the repo — it reads from a local file that isn't included with the npx package.
            </li>
            <li>
              Limit orders are only available in debug mode (<code className="text-orange-400 font-mono">DEBUG ON</code>) and are intended for testing.
            </li>
            <li>
              Password input requires a proper terminal. Some embedded shells (VS Code terminal, certain IDEs) may not hide characters correctly.
            </li>
            <li>
              Sessions are stored locally per machine and per server URL. Logging in on one machine does not log you in elsewhere.
            </li>
          </ul>
        </Section>
      </main>
    </div>
  );
}
