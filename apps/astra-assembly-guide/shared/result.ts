import type { ModelKey, ServiceTier } from "./copy.ts";
import type { Assembly } from "./schema.ts";
import type { Usage } from "./usage.ts";

export type AssembleResult = {
  modelKey: ModelKey;
  model: string;
  source: "live" | "mock";
  assembly: Assembly;
  latencyMs: number;
  usage: Usage;
  costUsd: number;
  costEstimated: boolean;
  costMultiplier: number;
  ultrafastPromo: boolean;
  requestedTier: ServiceTier;
  actualTier: string;
  tierNote: string;
  metricsNote: string;
};

export type AssembleResponse = {
  results: AssembleResult[];
  errors: { modelKey: ModelKey; message: string }[];
};

export type ModePayload = {
  mode: "live" | "mock";
  banner: string;
  detail: string;
  models: Record<ModelKey, string>;
  commands: string[];
  reasoningEffort: "low";
};
