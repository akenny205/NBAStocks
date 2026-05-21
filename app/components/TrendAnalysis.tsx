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
    <div className="mt-8">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        AI Trend Analysis
      </h2>

      {!analysis && !loading && !error && (
        <button
          onClick={fetchAnalysis}
          className="w-full bg-zinc-900 border border-zinc-800/60 hover:bg-zinc-800/60 text-zinc-300 text-sm font-medium rounded-xl px-4 py-3.5 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-base">✦</span>
          Get AI Trend Analysis
        </button>
      )}

      {loading && (
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
            <span className="text-zinc-500 text-sm">Analyzing recent performance...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-zinc-900 border border-red-500/20 rounded-xl px-4 py-3.5">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchAnalysis}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-2"
          >
            Try again
          </button>
        </div>
      )}

      {analysis && (
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <span>✦</span>
            <span>AI Analysis</span>
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed">{analysis}</p>
          <button
            onClick={() => { setAnalysis(null); setError(null); }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Refresh analysis
          </button>
        </div>
      )}
    </div>
  );
}
