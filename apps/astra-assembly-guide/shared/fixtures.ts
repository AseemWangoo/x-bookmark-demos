import type { ModelKey } from "./copy.ts";
import { KITS, type KitId } from "./fixtures/kits.ts";
import meta from "./fixtures/meta.json" with { type: "json" };
import type { Usage } from "./usage.ts";

export type FixtureMetrics = {
  latencyMs: number;
  costUsd: number;
  usage: Usage;
};

type MetaFile = {
  serviceTier: string;
  kits: Record<KitId, Record<ModelKey, FixtureMetrics>>;
};

const file = meta as MetaFile;

export function recordedMetrics(kitId: KitId, model: ModelKey): FixtureMetrics {
  const row = file.kits[kitId][model];
  return {
    latencyMs: row.latencyMs,
    costUsd: row.costUsd,
    usage: { ...row.usage },
  };
}

export const RECORDED_SERVICE_TIER = file.serviceTier;

export { KITS };
