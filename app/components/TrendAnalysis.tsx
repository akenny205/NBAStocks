"use client";

import { useState } from "react";

type Props = {
  playerId: number;
  playerName: string;
};

export function TrendAnalysis({ playerId }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${playerId}/analysis`);
      if (!res.ok) throw new Error("Failed to fetch analysis");
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      setError("Could not load analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        AI Trend Analysis
      </h2>

      {!analysis && !loading && (
        <button
          onClick={fetchAnalysis}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-medium rounded-xl px-4 py-3 transition-colors"
        >
          Get AI Trend Analysis
        </button>
      )}

      {loading && (
        <div className="bg-zinc-900 rounded-xl px-4 py-3 text-zinc-500 text-sm animate-pulse">
          Analyzing recent performance...
        </div>
      )}

      {error && (
        <div className="bg-zinc-900 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {analysis && (
        <div className="bg-zinc-900 rounded-xl px-4 py-4 space-y-3">
          <p className="text-zinc-200 text-sm leading-relaxed">{analysis}</p>
          <button
            onClick={() => { setAnalysis(null); setError(null); }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
