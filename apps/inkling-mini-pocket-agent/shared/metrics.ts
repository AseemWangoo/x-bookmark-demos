export const TOKENS_PER_SEC_FORMULA =
  "completion tokens after first token ÷ generation seconds";

export function tokensPerSec(input: {
  completionTokens: number | null;
  ttftMs: number | null;
  wallMs: number | null;
}): number | null {
  const { completionTokens, ttftMs, wallMs } = input;
  if (completionTokens == null || ttftMs == null || wallMs == null) return null;
  if (!Number.isFinite(completionTokens) || completionTokens < 0) return null;
  if (!Number.isFinite(ttftMs) || !Number.isFinite(wallMs)) return null;
  const generationMs = wallMs - ttftMs;
  if (generationMs <= 0) return null;
  return completionTokens / (generationMs / 1000);
}

export function tokensPerSecLabel(value: number | null): string {
  return value == null ? "n/a" : TOKENS_PER_SEC_FORMULA;
}
