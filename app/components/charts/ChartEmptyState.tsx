type Props = {
  message?: string;
};

export function ChartEmptyState({
  message = "No trades or game activity recorded in the selected period.",
}: Props) {
  return (
    <div className="h-56 flex items-center justify-center">
      <div className="text-center px-6 py-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="text-zinc-300 text-sm font-medium mb-1">No data for this range</div>
        <div className="text-zinc-500 text-xs">{message}</div>
      </div>
    </div>
  );
}
