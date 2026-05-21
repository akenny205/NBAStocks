"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { CompareChart, type PlayerSeries } from "@/app/components/CompareChart";
import { BuyDialog } from "@/app/components/BuyDialog";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { fmt } from "@/lib/format";
import { COLORS } from "@/lib/constants";

const RANGES = ["1M", "3M", "1Y", "3Y", "ALL"] as const;
type Range = (typeof RANGES)[number];

type SearchResult = {
  id: number;
  name: string;
  isActive: boolean;
  currentPrice: number | null;
  team: string | null;
  stats: { ppg: number; rpg: number; apg: number } | null;
};

const NBA_TEAMS = [
  "ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN",
  "DET","GSW","HOU","IND","LAC","LAL","MEM","MIA",
  "MIL","MIN","NOP","NYK","OKC","ORL","PHI","PHX",
  "POR","SAC","SAS","TOR","UTA","WAS",
];

export function PlayersClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [range, setRange] = useState<Range>("1Y");
  const [chartData, setChartData] = useState<PlayerSeries[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterTeam, setFilterTeam] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const hasFilters = !!(filterTeam || filterMinPrice || filterMaxPrice || filterActive !== null);

  useEffect(() => {
    const hasSearch = query.trim() || hasFilters;
    if (!hasSearch) { setResults([]); return; }
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
      setResults(await res.json());
      setSearching(false);
    }, 300);
  }, [query, filterTeam, filterMinPrice, filterMaxPrice, filterActive, hasFilters]);

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
      if (prev.find((p) => p.id === player.id)) return prev.filter((p) => p.id !== player.id);
      if (prev.length >= 8) return prev;
      return [...prev, player];
    });
  }, []);

  const isSelected = (id: number) => selected.some((p) => p.id === id);
  const selectedColor = (id: number) => {
    const idx = selected.findIndex((p) => p.id === id);
    return idx >= 0 ? COLORS[idx % COLORS.length] : null;
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Players</h1>
        <p className="text-zinc-500 text-sm mt-1">Search, filter, and compare player stock prices</p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-zinc-900 border border-zinc-800/60 rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-zinc-500 font-medium block mb-1.5">Team</label>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
            >
              <option value="">All teams</option>
              {NBA_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium block mb-1.5">Min Price</label>
            <input
              type="number"
              value={filterMinPrice}
              onChange={(e) => setFilterMinPrice(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium block mb-1.5">Max Price</label>
            <input
              type="number"
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(e.target.value)}
              placeholder="999"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium block mb-1.5">Status</label>
            <select
              value={filterActive === null ? "" : String(filterActive)}
              onChange={(e) => setFilterActive(e.target.value === "" ? null : e.target.value === "true")}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
            >
              <option value="">All players</option>
              <option value="true">Active</option>
              <option value="false">Retired</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={() => { setFilterTeam(""); setFilterMinPrice(""); setFilterMaxPrice(""); setFilterActive(null); }}
            className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Compare chart */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Compare</h2>
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Selected player pills */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((p, i) => (
              <button
                key={p.id}
                onClick={() => togglePlayer(p)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-black hover:opacity-75 transition-opacity"
                style={{ background: COLORS[i % COLORS.length] }}
              >
                {p.name} <span className="opacity-60">×</span>
              </button>
            ))}
          </div>
        )}

        {loadingChart ? (
          <div className="h-72 flex items-center justify-center text-zinc-600 text-sm">Loading…</div>
        ) : (
          <CompareChart players={chartData} range={range} />
        )}

        <div className="flex gap-1 mt-3 pt-3 border-t border-zinc-800/60">
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
      <div className="relative mb-6">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players by name…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors pr-10"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
          )}
        </div>

        {results.length > 0 && (
          <div className="absolute z-10 w-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-96 overflow-y-auto">
            {results.map((player) => {
              const sel = isSelected(player.id);
              const color = selectedColor(player.id);
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/60 last:border-0"
                >
                  <button
                    onClick={() => togglePlayer(player)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="relative flex-shrink-0">
                      <PlayerAvatar playerId={player.id} playerName={player.name} size="sm" />
                      {sel && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900"
                          style={{ background: color! }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white font-medium truncate">{player.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                        {player.team && <span>{player.team}</span>}
                        {player.team && player.stats && <span>·</span>}
                        {player.stats && <span>{player.stats.ppg} PPG · {player.stats.rpg} REB · {player.stats.apg} AST</span>}
                        <span className={`${player.isActive ? "text-green-500" : "text-zinc-600"}`}>
                          · {player.isActive ? "Active" : "Retired"}
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <Link
                      href={`/players/${player.id}`}
                      className="text-sm font-semibold text-white tabular-nums"
                    >
                      {player.currentPrice ? `$${fmt(player.currentPrice)}` : "—"}
                    </Link>
                    {player.currentPrice && (
                      <BuyDialog playerId={player.id} playerName={player.name} currentPrice={player.currentPrice} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top players grid (shown when no search/filter active) */}
      {!query && !results.length && <TopPlayers onSelect={togglePlayer} isSelected={isSelected} />}
    </main>
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
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Top Players</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {players.map((player) => {
          const sel = isSelected(player.id);
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                sel ? "border-orange-500/40 bg-orange-500/5" : "border-zinc-800/60 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <button onClick={() => onSelect(player)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                <PlayerAvatar playerId={player.id} playerName={player.name} size="md" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{player.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                    {player.team && <span>{player.team}</span>}
                    {player.stats && <span>· {player.stats.ppg} PPG</span>}
                    <span className={player.isActive ? "text-green-500" : "text-zinc-600"}>
                      · {player.isActive ? "Active" : "Retired"}
                    </span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <Link
                  href={`/players/${player.id}`}
                  className="text-sm font-semibold text-white tabular-nums"
                >
                  {player.currentPrice ? `$${fmt(player.currentPrice)}` : "—"}
                </Link>
                {player.currentPrice && (
                  <BuyDialog playerId={player.id} playerName={player.name} currentPrice={player.currentPrice} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
