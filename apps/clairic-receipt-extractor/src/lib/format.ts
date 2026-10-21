export function formatConfidence(confidence: number): string {
  const pct = confidence * 100;
  if (pct >= 99.95) return "100%";
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

export function formatProbability(value: number): string {
  if (value >= 0.01) return value.toFixed(2);
  return value.toExponential(1);
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (Math.abs(amount) < 0.01) return `$${amount.toFixed(6)}`;
  return `$${amount.toFixed(4)}`;
}

export function formatUsdPerMillion(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatValue(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "null";
}

export function valuesAgree(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
