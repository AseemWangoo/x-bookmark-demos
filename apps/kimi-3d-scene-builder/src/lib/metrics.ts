import type { ModelChoice } from "./types.ts";

export type SessionTurn = {
  model: ModelChoice;
  totalMs: number;
  costUsd: number;
};

export type ModelAverage = {
  count: number;
  avgTotalMs: number;
  avgCostUsd: number;
};

export type SessionSummary = {
  sessionCostUsd: number;
  pro: ModelAverage | null;
  highspeed: ModelAverage | null;
};

function average(turns: SessionTurn[], model: ModelChoice): ModelAverage | null {
  const rows = turns.filter((turn) => turn.model === model);
  if (rows.length === 0) return null;
  const totalMs = rows.reduce((sum, turn) => sum + turn.totalMs, 0);
  const costUsd = rows.reduce((sum, turn) => sum + turn.costUsd, 0);
  return {
    count: rows.length,
    avgTotalMs: totalMs / rows.length,
    avgCostUsd: costUsd / rows.length,
  };
}

export function summarizeSession(turns: SessionTurn[]): SessionSummary {
  return {
    sessionCostUsd: turns.reduce((sum, turn) => sum + turn.costUsd, 0),
    pro: average(turns, "pro"),
    highspeed: average(turns, "highspeed"),
  };
}
