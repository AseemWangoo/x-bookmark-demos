import type { Usage } from "./types.ts";

export const DECISIONS_CONCURRENCY = 8;

export function emptyUsage(): Usage {
  return {
    input_tokens: 0,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: 0,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 0,
  };
}

export function addUsage(left: Usage, right: Usage): Usage {
  return {
    input_tokens: left.input_tokens + right.input_tokens,
    input_tokens_details: {
      cached_tokens: left.input_tokens_details.cached_tokens + right.input_tokens_details.cached_tokens,
      cache_write_tokens:
        left.input_tokens_details.cache_write_tokens + right.input_tokens_details.cache_write_tokens,
    },
    output_tokens: left.output_tokens + right.output_tokens,
    output_tokens_details: {
      reasoning_tokens:
        left.output_tokens_details.reasoning_tokens + right.output_tokens_details.reasoning_tokens,
    },
    total_tokens: left.total_tokens + right.total_tokens,
  };
}

export function sumUsage(usages: Usage[]): Usage {
  return usages.reduce(addUsage, emptyUsage());
}

export function percentile50(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

export function maxLatency(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

/** Wall-clock time of a concurrency-limited pool, in submission order. */
export function scheduledBatchMs(latencies: number[], concurrency: number): number {
  if (latencies.length === 0) return 0;
  const workers = Math.max(1, Math.min(concurrency, latencies.length));
  const freeAt = Array.from({ length: workers }, () => 0);
  for (const latency of latencies) {
    let chosen = 0;
    for (let index = 1; index < freeAt.length; index += 1) {
      if ((freeAt[index] ?? 0) < (freeAt[chosen] ?? 0)) chosen = index;
    }
    freeAt[chosen] = (freeAt[chosen] ?? 0) + latency;
  }
  return Math.max(...freeAt);
}

/** Responses batch time divided by Decisions batch time. */
export function speedupRatio(responsesMs: number, decisionsMs: number): number | null {
  if (decisionsMs <= 0) return null;
  return responsesMs / decisionsMs;
}
