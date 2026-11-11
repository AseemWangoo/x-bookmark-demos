import type { Usage } from "../shared/port.ts";
import { estimateTokens } from "./cost.ts";

export function normalizeUsage(
  raw: unknown,
  prompt: string,
  output: string,
): { usage: Usage; notes: string[] } {
  const record = asRecord(raw);
  const inputTokens = readCount(record?.inputTokens);
  const outputTokens = readCount(record?.outputTokens);
  if (inputTokens === undefined || outputTokens === undefined) {
    return {
      usage: {
        inputTokens: estimateTokens(prompt),
        outputTokens: estimateTokens(output),
        cachedInputTokens: 0,
        reasoningTokens: null,
        estimated: true,
      },
      notes: [
        "Usage fields were missing. Tokens are a labelled estimate of about 4 characters per token, priced at the intro rates.",
      ],
    };
  }

  const notes: string[] = [];
  const cacheRead = readCount(asRecord(record?.inputTokenDetails)?.cacheReadTokens);
  const reasoning = readCount(asRecord(record?.outputTokenDetails)?.reasoningTokens);
  if (cacheRead === undefined) {
    notes.push(
      "cacheReadTokens was absent. The full input is priced as fresh input at the intro input rate.",
    );
  }
  if (reasoning === undefined) {
    notes.push("reasoningTokens was absent. Cost uses outputTokens only.");
  }

  return {
    usage: {
      inputTokens,
      outputTokens,
      cachedInputTokens: cacheRead ?? 0,
      reasoningTokens: reasoning ?? null,
      estimated: false,
    },
    notes,
  };
}

function readCount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (value && typeof value === "object" && "total" in value) {
    const total = (value as { total?: unknown }).total;
    if (typeof total === "number" && Number.isFinite(total) && total >= 0) return total;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}
