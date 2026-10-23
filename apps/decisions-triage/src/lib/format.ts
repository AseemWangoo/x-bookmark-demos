export function formatMs(ms: number): string {
  return `${Math.round(ms).toLocaleString("en-US")} ms`;
}

export function formatPercent(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const digits = Math.abs(amount) > 0 && Math.abs(amount) < 0.01 ? 6 : 4;
  return `$${amount.toFixed(digits)}`;
}

export function formatTokens(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatRatio(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  return `${ratio.toFixed(2)}×`;
}
