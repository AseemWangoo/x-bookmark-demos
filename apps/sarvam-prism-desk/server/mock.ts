import { allMockResponses, type MockResponse } from "../fixtures/mock-responses";
import type { Lang } from "../src/lib/types";
import { syntheticLatencyMs, textHash } from "./latency";
import { scoreMessage } from "./mock-scorer";

export type MockHit = {
  source: "fixture" | "mock-heuristic";
  response: MockResponse;
  serverMs: number;
  presetId?: string;
  lang?: Lang;
};

const byHash = new Map<string, { response: MockResponse; presetId: string; lang: Lang }>();
for (const row of allMockResponses()) {
  byHash.set(textHash(row.text), {
    response: row.response,
    presetId: row.presetId,
    lang: row.lang,
  });
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function mockRoute(
  text: string,
  mockSpeed: number,
  signal?: AbortSignal,
): Promise<MockHit> {
  const planned = syntheticLatencyMs(text) / (mockSpeed || 1);
  const started = performance.now();
  await sleep(planned, signal);
  const serverMs = performance.now() - started;
  const hit = byHash.get(textHash(text));
  if (hit) {
    return {
      source: "fixture",
      response: hit.response,
      serverMs,
      presetId: hit.presetId,
      lang: hit.lang,
    };
  }
  return { source: "mock-heuristic", response: scoreMessage(text), serverMs };
}
