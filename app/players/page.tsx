"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { CompareChart, type PlayerSeries } from "@/app/components/CompareChart";
import { BuyDialog } from "@/app/components/BuyDialog";
import { fmt } from "@/lib/format";

const RANGES = ["1M", "3M", "1Y", "3Y", "ALL"] as const;
type Range = (typeof RANGES)[number];

type SearchResult = {
  id: number;
  name: string;
  isActive: boolean;
  currentPrice: number | null;
  team: string | null;
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
  } | null;
};

const COLORS = [
  "#f97316", "#22c55e", "#3b82f6", "#a855f7",
  "#ec4899", "#eab308", "#14b8a6", "#f43f5e",
];

export default function PlayersPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [range, setRange] = useState<Range>("1Y");
  const [chartData, setChartData] = useState<PlayerSeries[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [filterTeam, setFilterTeam] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

  // Search players with filters
  useEffect(() => {
    const hasFilters = query.trim() || filterTeam || filterMinPrice || filterMaxPrice || filterActive !== null;
    if (!hasFilters) { setResults([]); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const params = new URLSearchParams();

      if (query.trim()) params.append("search", query);
      if (filterTeam) params.append("team", filterTeam);
      if (filterMinPrice) params.append("minPrice", filterMinPrice);
      if (filterMaxPrice) params.append("maxPrice", filterMaxPrice);
      if (filterActive !== null) params.append("isActive", String(filterActive));

      params.append("limit", "500");

      const res = await fetch(`/api/players?${params}`);
      const data = await res.json();
      setResults(data);
      setSearching(false);
    }, 300);
  }, [query, filterTeam, filterMinPrice, filterMaxPrice, filterActive]);

  // Initialize available teams with current NBA teams
  useEffect(() => {
    const nbaTeams = [
      "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN",
      "DET", "GSW", "HOU", "IND", "LAC", "LAL", "MEM", "MIA",
      "MIL", "MIN", "NOP", "NYK", "OKC", "ORL", "PHI", "PHX",
      "POR", "SAC", "SAS", "TOR", "UTA", "WAS"
    ];
    setAvailableTeams(nbaTeams);
  }, []);

  // Fetch chart data whenever selected players or range changes
  useEffect(() => {
    if (selected.length === 0) { setChartData([]); return; }
    setLoadingChart(true);
    const ids = selected.map((p) => p.id).join(",");
    fetch(`/api/players/compare?ids=${ids}&range=${range}`)
      .then((r) => r.json())
      .then((data) => { setChartData(data); setLoadingChart(false); })
      .catch(() => setLoadingChart(false));
  }, [selected, range]);

  const togglePlayer = useCallback((player: SearchResult) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === player.id);
      if (exists) return prev.filter((p) => p.id !== player.id);
      if (prev.length >= 8) return prev; // max 8
      return [...prev, player];
    });
  }, []);

  const isSelected = (id: number) => selected.some((p) => p.id === id);
  const selectedColor = (id: number) => {
    const idx = selected.findIndex((p) => p.id === id);
    return idx >= 0 ? COLORS[idx % COLORS.length] : null;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar inline to avoid server component */}
      <nav className="border-b border-zinc-900 bg-black px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-orange-500 font-bold text-xl tracking-tight">
          🏀 NBAStocks
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Portfolio</Link>
          <Link href="/players" className="text-sm text-white font-medium">Players</Link>
          <Link href="/transactions" className="text-sm text-zinc-400 hover:text-white transition-colors">History</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Compare Players</h1>
          <p className="text-zinc-500 text-sm mt-1">Search and select up to 8 players to compare price history</p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4 bg-zinc-950 border border-zinc-900 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Team filter */}
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Team</label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">All teams</option>
                {availableTeams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Min Price</label>
              <input
                type="number"
                value={filterMinPrice}
                onChange={(e) => setFilterMinPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Max Price</label>
              <input
                type="number"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                placeholder="999"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Active/Retired */}
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Status</label>
              <select
                value={filterActive === null ? "" : String(filterActive)}
                onChange={(e) => setFilterActive(e.target.value === "" ? null : e.target.value === "true")}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">All players</option>
                <option value="true">Active</option>
                <option value="false">Retired</option>
              </select>
            </div>
          </div>

          {/* Clear filters */}
          {(filterTeam || filterMinPrice || filterMaxPrice || filterActive !== null) && (
            <button
              onClick={() => {
                setFilterTeam("");
                setFilterMinPrice("");
                setFilterMaxPrice("");
                setFilterActive(null);
              }}
              className="text-xs text-zinc-500 hover:text-white transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Selected pills */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((p, i) => (
              <button
                key={p.id}
                onClick={() => togglePlayer(p)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-black transition-opacity hover:opacity-80"
                style={{ background: COLORS[i % COLORS.length] }}
              >
                {p.name}
                <span className="ml-1 opacity-70">×</span>
              </button>
            ))}
            {selected.length > 1 && (
              <button
                onClick={() => setSelected([])}
                className="px-3 py-1 rounded-full text-xs text-zinc-500 border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-6">
          {loadingChart ? (
            <div className="h-72 flex items-center justify-center text-zinc-600 text-sm">
              Loading...
            </div>
          ) : (
            <CompareChart players={chartData} range={range} />
          )}

          {/* Range selector */}
          <div className="flex gap-1 mt-3 pt-3 border-t border-zinc-900">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  range === r ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors pr-10"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-zinc-600 border-t-orange-500 rounded-full animate-spin" />
            )}
          </div>

          {/* Search results dropdown */}
          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-96 overflow-y-auto">
              {results.map((player) => {
                const sel = isSelected(player.id);
                const color = selectedColor(player.id);
                return (
                  <div
                    key={player.id}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                  >
                    <button
                      onClick={() => togglePlayer(player)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      {sel ? (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color! }} />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-zinc-700 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white font-medium truncate">{player.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {player.team && <span>{player.team} · </span>}
                          {player.stats && <span>{player.stats.ppg} PPG · {player.stats.rpg} RPG · {player.stats.apg} APG</span>}
                          <span className={`ml-2 ${player.isActive ? "text-green-400" : "text-zinc-600"}`}>
                            {player.isActive ? "Active" : "Retired"}
                          </span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-sm text-white font-semibold">
                          {player.currentPrice ? `$${fmt(player.currentPrice)}` : "—"}
                        </span>
                        {sel && <span className="text-xs text-zinc-500 block">click to remove</span>}
                      </div>
                      {player.currentPrice && (
                        <BuyDialog
                          playerId={player.id}
                          playerName={player.name}
                          currentPrice={player.currentPrice}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top active players as quick-add chips when search is empty and no filters */}
        {!query && !results.length && selected.length === 0 && (
          <TopPlayers onSelect={togglePlayer} isSelected={isSelected} />
        )}
      </main>
    </div>
  );
}

function TopPlayers({
  onSelect,
  isSelected,
}: {
  onSelect: (p: SearchResult) => void;
  isSelected: (id: number) => boolean;
}) {
  const [players, setPlayers] = useState<SearchResult[]>([]);

  useEffect(() => {
    fetch("/api/players?limit=20")
      .then((r) => r.json())
      .then(setPlayers)
      .catch(() => {});
  }, []);

  if (players.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">Top Players</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player) => {
          const sel = isSelected(player.id);
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                sel
                  ? "border-orange-500/50 bg-orange-500/10"
                  : "border-zinc-900 bg-zinc-950 hover:border-zinc-700"
              }`}
            >
              <button
                onClick={() => onSelect(player)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-sm font-medium text-white truncate">{player.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {player.team && <span>{player.team} · </span>}
                  {player.stats && <span>{player.stats.ppg} PPG</span>}
                  <span className={`ml-2 ${player.isActive ? "text-green-400" : "text-zinc-600"}`}>
                    {player.isActive ? "Active" : "Retired"}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-sm font-semibold text-white text-right">
                  {player.currentPrice ? `$${fmt(player.currentPrice)}` : "—"}
                </div>
                {player.currentPrice && (
                  <BuyDialog
                    playerId={player.id}
                    playerName={player.name}
                    currentPrice={player.currentPrice}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
