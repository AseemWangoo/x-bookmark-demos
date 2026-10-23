import type { RouteValue, Usage } from "../src/lib/types.ts";

/**
 * Illustrative Responses API comparisons.
 * output_text is strict JSON { urgent, route, priority }.
 * There are no probabilities. Timings are hand-picked, about 3–8× the Decisions mocks.
 * synthetic is always true. These are not measurements.
 */

export type IllustrativeResponse = {
  synthetic: true;
  id: string;
  latencyMs: number;
  output_text: string;
  usage: Usage;
  answer: { urgent: boolean; route: RouteValue; priority: 1 | 2 | 3 | 4 | 5 };
};

function usage(input: number, cached: number, cacheWrite: number, output: number, reasoning: number): Usage {
  return {
    input_tokens: input,
    input_tokens_details: { cached_tokens: cached, cache_write_tokens: cacheWrite },
    output_tokens: output,
    output_tokens_details: { reasoning_tokens: reasoning },
    total_tokens: input + output,
  };
}

const ANSWERS: {
  id: string;
  latencyMs: number;
  usage: Usage;
  answer: IllustrativeResponse["answer"];
}[] = [
  { id: "m1", latencyMs: 1302, usage: usage(268, 0, 0, 96, 44), answer: { urgent: true, route: "bug", priority: 5 } },
  { id: "m2", latencyMs: 1708, usage: usage(320, 40, 0, 84, 30), answer: { urgent: false, route: "billing", priority: 3 } },
  { id: "m3", latencyMs: 1564, usage: usage(430, 0, 20, 110, 52), answer: { urgent: false, route: "sales", priority: 4 } },
  { id: "m4", latencyMs: 1650, usage: usage(210, 0, 0, 70, 18), answer: { urgent: false, route: "spam", priority: 1 } },
  { id: "m5", latencyMs: 1768, usage: usage(290, 16, 0, 88, 36), answer: { urgent: false, route: "bug", priority: 2 } },
  { id: "m6", latencyMs: 1938, usage: usage(400, 0, 0, 102, 48), answer: { urgent: true, route: "billing", priority: 4 } },
  { id: "m7", latencyMs: 3120, usage: usage(350, 0, 0, 140, 90), answer: { urgent: false, route: "sales", priority: 3 } },
  { id: "m8", latencyMs: 2024, usage: usage(370, 50, 0, 94, 40), answer: { urgent: false, route: "bug", priority: 3 } },
  { id: "m9", latencyMs: 1508, usage: usage(230, 0, 0, 76, 22), answer: { urgent: false, route: "spam", priority: 1 } },
  { id: "m10", latencyMs: 1922, usage: usage(420, 0, 8, 118, 60), answer: { urgent: true, route: "bug", priority: 5 } },
];

export const MOCK_RESPONSES: IllustrativeResponse[] = ANSWERS.map((item) => ({
  synthetic: true,
  id: item.id,
  latencyMs: item.latencyMs,
  output_text: JSON.stringify(item.answer),
  usage: item.usage,
  answer: item.answer,
}));

export function illustrativeResponse(id: string): IllustrativeResponse {
  const found = MOCK_RESPONSES.find((item) => item.id === id);
  if (!found) throw new Error(`No illustrative response for ${id}`);
  return found;
}
