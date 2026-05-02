import * as readline from "readline";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const BASE_URL = process.argv[2]?.startsWith("http")
  ? process.argv[2].replace(/\/$/, "")
  : (process.env.NBASTOCKS_URL ?? "http://localhost:3000");

// Token file is keyed per server so switching URLs forces a fresh login
function urlKey(url: string): string {
  try { return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, "_"); }
  catch { return "local"; }
}
const TOKEN_FILE = path.join(os.homedir(), `.nbastocks-${urlKey(BASE_URL)}.token`);
const TICKERS_FILE = path.join(__dirname, "../data/tickers.json");

// ── Auth ──────────────────────────────────────────────────────────────────────

function saveToken(token: string) {
  fs.writeFileSync(TOKEN_FILE, token, "utf8");
}

function loadToken(): string | null {
  try { return fs.readFileSync(TOKEN_FILE, "utf8").trim(); } catch { return null; }
}

function clearToken() {
  try { fs.unlinkSync(TOKEN_FILE); } catch { /* ignore */ }
}

async function api(
  method: string,
  path: string,
  token?: string | null,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { ok: false, status: 0, data: { error: `Could not reach server at ${BASE_URL}` } };
  }
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { error: `HTTP ${res.status} — ${text.slice(0, 120)}` }; }
  } else {
    data = { error: `HTTP ${res.status} (empty response)` };
  }
  return { ok: res.ok, status: res.status, data };
}

// Read a line using a short-lived readline (no echo issues)
function readLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Read a password without echoing — no readline active during this call
function readPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let password = "";
    const onData = (char: string) => {
      const code = char.charCodeAt(0);
      if (char === "\r" || char === "\n" || code === 4) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(password);
      } else if (code === 3) {
        process.stdout.write("\n");
        process.exit();
      } else if (code === 127 || code === 8) {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (code >= 32) {
        password += char;
        process.stdout.write("*");
      }
    };
    process.stdin.on("data", onData);
  });
}

async function login(): Promise<string> {
  console.log("");
  const email = await readLine("  Email: ");
  const password = await readPassword("  Password: ");
  const { ok, data } = await api("POST", "/api/cli/auth", null, { email, password });
  if (!ok) {
    console.log(`\n  Error: ${data.error ?? "Login failed"}\n`);
    return login();
  }
  saveToken(data.token as string);
  console.log(`\n  Logged in as ${data.email}`);
  return data.token as string;
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function sign(n: number) { return n >= 0 ? "+" : ""; }
function col(s: string, width: number) { return s.padEnd(width).slice(0, width); }
function rcol(s: string, width: number) { return s.padStart(width).slice(-width); }

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleQuote(ticker: string, token: string) {
  const { ok, data } = await api("GET", `/api/cli/quote/${ticker.toUpperCase()}`, token);
  if (!ok) { console.log(`  ${data.error ?? "Error"}`); return; }
  const status = data.isActive ? "Active" : "Retired";
  const price = data.currentPrice != null ? `$${fmt(data.currentPrice as number)}` : "N/A";
  console.log(`  ${data.ticker}  ${data.name}  ${price}  [${status}]`);
}

async function handleOrder(
  action: "buy" | "sell",
  ticker: string,
  shares: number,
  limitPrice: number | undefined,
  debug: boolean,
  token: string
) {
  if (limitPrice !== undefined && !debug) {
    console.log("  Limit orders require debug mode. Use DEBUG ON to enable.");
    return;
  }
  const { ok, data } = await api("POST", "/api/cli/order", token, {
    action, ticker: ticker.toUpperCase(), shares, limitPrice, debug,
  });
  if (!ok) { console.log(`  ${data.error ?? "Order failed"}`); return; }
  const verb = action === "buy" ? "Bought" : "Sold";
  const priceNote = limitPrice && debug ? ` [limit @ $${fmt(limitPrice)}]` : "";
  console.log(`  ${verb} ${data.shares} share${(data.shares as number) !== 1 ? "s" : ""} of ${data.playerName}${priceNote}`);
  console.log(`  @ $${fmt(data.price as number)}  |  Total: $${fmt(data.total as number)}  |  Balance: $${fmt(data.balanceAfter as number)}`);
}

async function handlePositions(token: string) {
  const { ok, data } = await api("GET", "/api/cli/portfolio", token);
  if (!ok) { console.log(`  ${data.error ?? "Error"}`); return; }
  const positions = data.positions as Array<{
    ticker: string; playerName: string; shares: number;
    avgBuyPrice: number; currentPrice: number; gainLoss: number; gainLossPct: number;
  }>;
  if (positions.length === 0) { console.log("  No open positions."); return; }
  console.log("");
  console.log(`  ${col("TICKER", 7)}${col("PLAYER", 22)}${rcol("SHARES", 8)}${rcol("AVG", 9)}${rcol("PRICE", 9)}${rcol("P&L", 10)}${rcol("P&L%", 7)}`);
  console.log(`  ${"─".repeat(72)}`);
  for (const p of positions) {
    const glStr = `${sign(p.gainLoss)}$${fmt(Math.abs(p.gainLoss))}`;
    const glPctStr = `${sign(p.gainLossPct)}${fmt(Math.abs(p.gainLossPct))}%`;
    console.log(`  ${col(p.ticker, 7)}${col(p.playerName, 22)}${rcol(fmt(p.shares), 8)}${rcol("$" + fmt(p.avgBuyPrice), 9)}${rcol("$" + fmt(p.currentPrice), 9)}${rcol(glStr, 10)}${rcol(glPctStr, 7)}`);
  }
  console.log("");
  console.log(`  Balance: $${fmt(data.balance as number)}`);
}

async function handleBalance(token: string) {
  const { ok, data } = await api("GET", "/api/cli/portfolio", token);
  if (!ok) { console.log(`  ${data.error ?? "Error"}`); return; }
  console.log(`  Balance: $${fmt(data.balance as number)}`);
}

const PAGE_SIZE = 20;

type TickerEntry = { ticker: string; id: number; name: string };

function renderPage(entries: TickerEntry[], page: number, totalPages: number, query: string) {
  process.stdout.write("\x1B[2J\x1B[H"); // clear screen, cursor to top
  const slice = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const header = query ? `  Results for "${query}"` : `  All tickers`;
  console.log(`\n${header}  (${entries.length} total — page ${page}/${totalPages})\n`);
  console.log(`  ${col("TICKER", 12)}PLAYER`);
  console.log(`  ${"─".repeat(40)}`);
  for (const e of slice) {
    console.log(`  ${col(e.ticker, 12)}${e.name}`);
  }
  console.log("");
  const hints: string[] = [];
  if (page > 1)          hints.push("← / k  prev");
  if (page < totalPages) hints.push("→ / j  next");
  hints.push("q  quit");
  console.log(`  [ ${hints.join("   ")} ]`);
}

async function handleTickers(args: string, rl: readline.Interface): Promise<void> {
  let map: { entries: TickerEntry[]; count: number };
  try {
    map = JSON.parse(fs.readFileSync(TICKERS_FILE, "utf8"));
  } catch {
    console.log("  Ticker map not found. Run: npm run db:tickers");
    return;
  }

  const q = args.trim().toUpperCase();
  const results = q
    ? map.entries.filter((e) => e.ticker.includes(q) || e.name.toUpperCase().includes(q))
    : map.entries;

  if (results.length === 0) {
    console.log(`  No tickers matching "${args.trim()}".`);
    return;
  }

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  let page = 1;

  renderPage(results, page, totalPages, args.trim());

  if (totalPages === 1) return; // no navigation needed

  await new Promise<void>((resolve) => {
    rl.pause();
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onKey = (key: string) => {
      const code = key.charCodeAt(0);
      const isNext = key === "\x1b[C" || key === "\x1b[B" || key === "j" || key === "\r" || key === "\n" || key === " ";
      const isPrev = key === "\x1b[D" || key === "\x1b[A" || key === "k";
      const isQuit = key === "q" || key === "Q" || code === 3 || code === 4 || key === "\x1b";

      if (isQuit) {
        process.stdout.write("\x1B[2J\x1B[H");
        process.stdin.setRawMode(false);
        process.stdin.removeListener("data", onKey);
        process.stdin.pause();
        // Discard any characters readline buffered while we were in raw mode
        (rl as unknown as { line: string; cursor: number }).line = "";
        (rl as unknown as { line: string; cursor: number }).cursor = 0;
        rl.resume();
        resolve();
      } else if (isNext && page < totalPages) {
        page++;
        renderPage(results, page, totalPages, args.trim());
      } else if (isPrev && page > 1) {
        page--;
        renderPage(results, page, totalPages, args.trim());
      }
    };

    process.stdin.on("data", onKey);
  });
}

function printHelp(debug: boolean) {
  console.log("");
  console.log("  Commands:");
  console.log("    QUOTE <TICKER>                   Get current price");
  console.log("    BUY <TICKER> <SHARES>            Market buy");
  console.log("    SELL <TICKER> <SHARES>           Market sell");
  if (debug) {
    console.log("    BUY <TICKER> <SHARES> @ <PRICE>  Limit buy  [debug]");
    console.log("    SELL <TICKER> <SHARES> @ <PRICE> Limit sell [debug]");
  }
  console.log("    POSITIONS                        Show holdings");
  console.log("    BALANCE                          Show cash balance");
  console.log("    TICKERS <query>                  Search tickers by name or ticker");
  console.log("    DEBUG ON / OFF                   Toggle debug mode");
  console.log("    LOGOUT                           Sign out and switch accounts");
  console.log("    HELP                             Show this list");
  console.log("    EXIT                             Quit");
  console.log("");
}

// ── Main REPL ─────────────────────────────────────────────────────────────────

// Runs the REPL for one session. Returns "logout" or "exit".
function runRepl(token: string): Promise<"logout" | "exit"> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let debug = false;

    const ask = () => {
      const promptStr = debug ? "  nbastocks [DEBUG]> " : "  nbastocks> ";
      rl.question(promptStr, async (raw) => {
        const line = raw.trim();
        if (!line) { ask(); return; }

        const parts = line.split(/\s+/);
        const cmd = parts[0].toUpperCase();

        if (cmd === "EXIT" || cmd === "QUIT") {
          console.log("\n  Disconnected.\n");
          rl.close();
          resolve("exit");
          return;
        }

        if (cmd === "LOGOUT") {
          clearToken();
          console.log("\n  Logged out.\n");
          rl.close();
          resolve("logout");
          return;
        }

        if (cmd === "HELP") {
          printHelp(debug);
        } else if (cmd === "BALANCE") {
          await handleBalance(token);
        } else if (cmd === "POSITIONS") {
          await handlePositions(token);
        } else if (cmd === "TICKERS") {
          await handleTickers(parts.slice(1).join(" "), rl);
        } else if (cmd === "DEBUG") {
          const flag = (parts[1] ?? "").toUpperCase();
          if (flag === "ON") { debug = true; console.log("  Debug mode ON — limit orders enabled."); }
          else if (flag === "OFF") { debug = false; console.log("  Debug mode OFF — market orders only."); }
          else console.log("  Usage: DEBUG ON | DEBUG OFF");
        } else if (cmd === "QUOTE") {
          if (!parts[1]) { console.log("  Usage: QUOTE <TICKER>"); }
          else await handleQuote(parts[1], token);
        } else if (cmd === "BUY" || cmd === "SELL") {
          const ticker = parts[1];
          const shares = parseFloat(parts[2]);
          const atIdx = parts.findIndex((p) => p === "@");
          const limitPrice = atIdx !== -1 ? parseFloat(parts[atIdx + 1]) : undefined;
          if (!ticker || isNaN(shares) || shares <= 0) {
            console.log(`  Usage: ${cmd} <TICKER> <SHARES> [@ <PRICE>]`);
          } else if (limitPrice !== undefined && isNaN(limitPrice)) {
            console.log("  Invalid limit price.");
          } else {
            await handleOrder(cmd.toLowerCase() as "buy" | "sell", ticker, shares, limitPrice, debug, token);
          }
        } else {
          console.log(`  Unknown command: ${cmd}. Type HELP for available commands.`);
        }

        ask();
      });
    };

    ask();
  });
}

async function main() {
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log("  ║     NBAStocks Exchange Terminal      ║");
  console.log("  ╚══════════════════════════════════════╝");
  console.log(`\n  Exchange: ${BASE_URL}`);

  while (true) {
    // ── Login phase (no readline active) ───────────────────────────────────
    let token = loadToken();
    if (!token) {
      console.log("\n  No session found. Please log in.");
      token = await login();
    } else {
      const { ok } = await api("GET", "/api/cli/portfolio", token);
      if (!ok) {
        console.log("\n  Session expired. Please log in.");
        clearToken();
        token = await login();
      }
    }

    const { ok, data } = await api("GET", "/api/cli/portfolio", token);
    if (ok) console.log(`  Balance: $${fmt(data.balance as number)}`);
    console.log("\n  Type HELP for available commands.\n");

    // ── REPL phase ──────────────────────────────────────────────────────────
    const result = await runRepl(token);
    if (result === "exit") break;
    // "logout" → loop back to login
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
