export const ROUTE_VALUES = ["billing", "bug", "sales", "spam"] as const;

export type RouteValue = (typeof ROUTE_VALUES)[number];

export type Channel = "email" | "ticket";

export type PriorityRank = 1 | 2 | 3 | 4 | 5;

export type ExpectedLabels = {
  urgent: boolean;
  route: RouteValue;
  priority: PriorityRank;
};

export type InboxMessage = {
  id: string;
  channel: Channel;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  expected: ExpectedLabels;
};

export type Strategy = "per_message" | "packed";

export type RunMode = "mock" | "live";

export type Usage = {
  input_tokens: number;
  input_tokens_details: {
    cached_tokens: number;
    cache_write_tokens: number;
  };
  output_tokens: number;
  output_tokens_details: {
    reasoning_tokens: number;
  };
  total_tokens: number;
};

export type ChoiceProbability = {
  value: string | boolean;
  probability: number;
};

export type ScoreProbability = {
  value: number;
  label: string;
  probability: number;
};

export type NormalizedAnswers = {
  urgent: {
    probability: number | null;
    value: boolean | null;
    refused: boolean;
    unrecognised: boolean;
  };
  route: {
    choice: string | boolean | null;
    confidence: number | null;
    probabilities: ChoiceProbability[] | null;
    refused: boolean;
    unrecognised: boolean;
  };
  priority: {
    score: number | null;
    level: string | null;
    confidence: number | null;
    probabilities: ScoreProbability[] | null;
    refused: boolean;
    unrecognised: boolean;
  };
};

export type TriageRow = {
  id: string;
  answers: NormalizedAnswers;
  latencyMs: number;
  usage: Usage | null;
  raw: unknown;
};

export type TriageError = {
  id?: string;
  source: "decisions" | "responses";
  status?: number;
  message: string;
};

export type TriageBatch = {
  rows: TriageRow[];
  batchMs: number;
  usage: Usage;
  costUsd: number;
  synthetic?: boolean;
  reasoningEffort?: string;
};

export type TriageResponse = {
  mode: RunMode;
  strategy: Strategy;
  decisions: TriageBatch;
  responses?: TriageBatch;
  errors?: TriageError[];
};

export type TriageRequest = {
  messageIds: string[] | "all";
  strategy: Strategy;
  compare: boolean;
  forceMock?: boolean;
  urgentThreshold?: number;
};
