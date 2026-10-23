import type { RouteValue, Usage } from "../src/lib/types.ts";
import type { DecisionAnswer, DecisionPayload } from "../server/schema.ts";
import { PRIORITY_LEVELS, ROUTE_CHOICES } from "../server/questions.ts";

/**
 * Illustrative Decisions responses in the documented shape.
 * Hand-written so the console can render without an API key.
 * Not model output. Not a measurement. synthetic is always true.
 * Latencies vary; the Decisions/Responses ratio is about 3–8×, not a flat 10×.
 * m4.priority is a refusal so the refused path is visible.
 */

type RouteProbabilities = Record<RouteValue, number>;

type DecisionSpec = {
  id: string;
  latencyMs: number;
  usage: Usage;
  urgent: number;
  route: { choice: RouteValue; confidence: number; probabilities: RouteProbabilities };
  priority:
    | { refused: true }
    | { confidence: number; probabilities: [number, number, number, number, number] };
};

function usage(
  input: number,
  cached: number,
  cacheWrite: number,
  output: number,
  reasoning = 0,
): Usage {
  return {
    input_tokens: input,
    input_tokens_details: { cached_tokens: cached, cache_write_tokens: cacheWrite },
    output_tokens: output,
    output_tokens_details: { reasoning_tokens: reasoning },
    total_tokens: input + output,
  };
}

export const DECISION_SPECS: DecisionSpec[] = [
  {
    id: "m1",
    latencyMs: 310,
    usage: usage(248, 0, 0, 22),
    urgent: 0.96,
    route: { choice: "bug", confidence: 0.82, probabilities: { billing: 0.04, bug: 0.91, sales: 0.02, spam: 0.03 } },
    priority: { confidence: 0.71, probabilities: [0.01, 0.02, 0.04, 0.13, 0.8] },
  },
  {
    id: "m2",
    latencyMs: 280,
    usage: usage(302, 48, 0, 18),
    urgent: 0.22,
    route: { choice: "billing", confidence: 0.79, probabilities: { billing: 0.88, bug: 0.04, sales: 0.06, spam: 0.02 } },
    priority: { confidence: 0.66, probabilities: [0.04, 0.12, 0.62, 0.18, 0.04] },
  },
  {
    id: "m3",
    latencyMs: 460,
    usage: usage(410, 0, 36, 24),
    urgent: 0.18,
    route: { choice: "sales", confidence: 0.73, probabilities: { billing: 0.08, bug: 0.03, sales: 0.84, spam: 0.05 } },
    priority: { confidence: 0.58, probabilities: [0.02, 0.08, 0.22, 0.55, 0.13] },
  },
  {
    id: "m4",
    latencyMs: 220,
    usage: usage(196, 0, 0, 8),
    urgent: 0.04,
    route: { choice: "spam", confidence: 0.88, probabilities: { billing: 0.01, bug: 0.01, sales: 0.05, spam: 0.93 } },
    priority: { refused: true },
  },
  {
    id: "m5",
    latencyMs: 340,
    usage: usage(274, 20, 0, 16),
    urgent: 0.06,
    route: { choice: "bug", confidence: 0.81, probabilities: { billing: 0.02, bug: 0.9, sales: 0.02, spam: 0.06 } },
    priority: { confidence: 0.6, probabilities: [0.22, 0.58, 0.14, 0.04, 0.02] },
  },
  {
    id: "m6",
    latencyMs: 510,
    usage: usage(388, 0, 0, 20),
    urgent: 0.88,
    route: { choice: "billing", confidence: 0.77, probabilities: { billing: 0.9, bug: 0.04, sales: 0.04, spam: 0.02 } },
    priority: { confidence: 0.54, probabilities: [0.01, 0.03, 0.08, 0.28, 0.6] },
  },
  {
    id: "m7",
    latencyMs: 390,
    usage: usage(336, 0, 0, 19),
    urgent: 0.11,
    route: { choice: "billing", confidence: 0.41, probabilities: { billing: 0.47, bug: 0.04, sales: 0.44, spam: 0.05 } },
    priority: { confidence: 0.49, probabilities: [0.08, 0.22, 0.48, 0.18, 0.04] },
  },
  {
    id: "m8",
    latencyMs: 440,
    usage: usage(358, 64, 0, 17),
    urgent: 0.27,
    route: { choice: "bug", confidence: 0.75, probabilities: { billing: 0.05, bug: 0.86, sales: 0.03, spam: 0.06 } },
    priority: { confidence: 0.57, probabilities: [0.05, 0.14, 0.58, 0.18, 0.05] },
  },
  {
    id: "m9",
    latencyMs: 260,
    usage: usage(214, 0, 0, 14),
    urgent: 0.03,
    route: { choice: "sales", confidence: 0.38, probabilities: { billing: 0.05, bug: 0.04, sales: 0.49, spam: 0.42 } },
    priority: { confidence: 0.52, probabilities: [0.55, 0.3, 0.1, 0.04, 0.01] },
  },
  {
    id: "m10",
    latencyMs: 620,
    usage: usage(402, 0, 12, 21),
    urgent: 0.93,
    route: { choice: "bug", confidence: 0.63, probabilities: { billing: 0.24, bug: 0.71, sales: 0.02, spam: 0.03 } },
    priority: { confidence: 0.7, probabilities: [0.01, 0.02, 0.05, 0.12, 0.8] },
  },
];

export const PACKED_LATENCY_MS = 1120;

export const PACKED_USAGE: Usage = usage(3280, 180, 40, 96);

export type IllustrativeDecision = {
  synthetic: true;
  latencyMs: number;
  response: DecisionPayload;
};

function scoreAnswer(name: string, priority: Exclude<DecisionSpec["priority"], { refused: true }>): DecisionAnswer {
  const probabilities = priority.probabilities.map((probability, index) => ({
    value: index,
    label: PRIORITY_LEVELS[index]?.label ?? `P${index + 1}`,
    probability,
  }));
  const score = probabilities.reduce((sum, item) => sum + item.value * item.probability, 0);
  return {
    type: "score",
    name,
    score,
    confidence: priority.confidence,
    probabilities,
  };
}

function answersFor(spec: DecisionSpec, nameFor: (question: string) => string): DecisionAnswer[] {
  const answers: DecisionAnswer[] = [
    { type: "predicate", name: nameFor("urgent"), probability: spec.urgent },
    {
      type: "choice",
      name: nameFor("route"),
      choice: spec.route.choice,
      confidence: spec.route.confidence,
      probabilities: ROUTE_CHOICES.map((choice) => ({
        value: choice.value,
        probability: spec.route.probabilities[choice.value],
      })),
    },
  ];
  if ("refused" in spec.priority) {
    answers.push({ type: "refusal", name: nameFor("priority") });
  } else {
    answers.push(scoreAnswer(nameFor("priority"), spec.priority));
  }
  return answers;
}

export function illustrativeDecision(id: string): IllustrativeDecision {
  const spec = DECISION_SPECS.find((item) => item.id === id);
  if (!spec) throw new Error(`No illustrative decision for ${id}`);
  return {
    synthetic: true,
    latencyMs: spec.latencyMs,
    response: {
      model: "gpt-6-luna",
      usage: spec.usage,
      answers: answersFor(spec, (question) => question),
    },
  };
}

export function illustrativePackedDecision(ids: string[]): IllustrativeDecision {
  const specs = ids.map((id) => {
    const spec = DECISION_SPECS.find((item) => item.id === id);
    if (!spec) throw new Error(`No illustrative decision for ${id}`);
    return spec;
  });
  const fullSet =
    specs.length === DECISION_SPECS.length && specs.every((spec, index) => spec.id === DECISION_SPECS[index]?.id);
  const usage = fullSet
    ? PACKED_USAGE
    : specs.reduce<Usage>(
        (sum, spec) => ({
          input_tokens: sum.input_tokens + spec.usage.input_tokens,
          input_tokens_details: {
            cached_tokens: sum.input_tokens_details.cached_tokens + spec.usage.input_tokens_details.cached_tokens,
            cache_write_tokens:
              sum.input_tokens_details.cache_write_tokens + spec.usage.input_tokens_details.cache_write_tokens,
          },
          output_tokens: sum.output_tokens + spec.usage.output_tokens,
          output_tokens_details: {
            reasoning_tokens:
              sum.output_tokens_details.reasoning_tokens + spec.usage.output_tokens_details.reasoning_tokens,
          },
          total_tokens: sum.total_tokens + spec.usage.total_tokens,
        }),
        {
          input_tokens: 0,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
          output_tokens: 0,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 0,
        },
      );
  return {
    synthetic: true,
    latencyMs: fullSet ? PACKED_LATENCY_MS : Math.max(...specs.map((spec) => spec.latencyMs)),
    response: {
      model: "gpt-6-luna",
      usage,
      answers: specs.flatMap((spec) => answersFor(spec, (question) => `${spec.id}.${question}`)),
    },
  };
}

export const MOCK_DECISIONS: IllustrativeDecision[] = DECISION_SPECS.map((spec) => illustrativeDecision(spec.id));

export const MOCK_PACKED_DECISION: IllustrativeDecision = illustrativePackedDecision(
  DECISION_SPECS.map((spec) => spec.id),
);
