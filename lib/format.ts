export function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}
