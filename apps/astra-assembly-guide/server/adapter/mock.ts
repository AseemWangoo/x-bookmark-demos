import {
  CUSTOM_TEXT_MOCK_MESSAGE,
  PHOTO_MOCK_MESSAGE,
  ULTRAFAST_PROMO_LABEL,
  type ServiceTier,
} from "../../shared/copy.ts";
import { kitById, kitBySource, normalizeSource } from "../../shared/fixtures/kits.ts";
import { recordedMetrics } from "../../shared/fixtures.ts";
import type { AssembleResult } from "../../shared/result.ts";
import { costUsd } from "../cost.ts";
import { modelIdFor } from "../env.ts";
import { AssembleError, type AssembleJob, type AssemblyAdapter } from "./types.ts";

const LATENCY_SCALE: Record<ServiceTier, number> = {
  default: 1,
  fast: 0.58,
  ultrafast: 0.34,
};

export function createMockAdapter(env: NodeJS.ProcessEnv = process.env): AssemblyAdapter {
  return {
    mode: "mock",
    run(job) {
      return runMock(job, env);
    },
  };
}

function runMock(job: AssembleJob, env: NodeJS.ProcessEnv): Promise<AssembleResult> {
  if (job.imageDataUrl?.trim()) {
    return Promise.reject(new AssembleError(PHOTO_MOCK_MESSAGE, 422));
  }
  const text = job.sourceText ? normalizeSource(job.sourceText) : "";
  const kit = (text ? kitBySource(text) : undefined) ?? (!text && job.fixtureId ? kitById(job.fixtureId) : undefined);
  if (!kit) {
    return Promise.reject(new AssembleError(CUSTOM_TEXT_MOCK_MESSAGE, 422));
  }
  const recorded = recordedMetrics(kit.id, job.modelKey);
  const quote = costUsd(job.modelKey, job.serviceTier, recorded.usage);
  const scale = LATENCY_SCALE[job.serviceTier];
  const result: AssembleResult = {
    modelKey: job.modelKey,
    model: modelIdFor(job.modelKey, env),
    source: "mock",
    assembly: kit.assemblies[job.modelKey],
    latencyMs: Math.round(recorded.latencyMs * scale),
    usage: recorded.usage,
    costUsd: quote.usd,
    costEstimated: false,
    costMultiplier: quote.multiplier,
    ultrafastPromo: quote.ultrafastPromo,
    requestedTier: job.serviceTier,
    actualTier: job.serviceTier,
    tierNote: "Echo of the requested tier. No Responses call was made, so there is no returned service_tier.",
    metricsNote: quote.ultrafastPromo
      ? `Recorded tokens, repriced at 3×. ${ULTRAFAST_PROMO_LABEL}.`
      : "Recorded tokens. Latency is scaled from the Standard timing. USD is repriced for this tier. Not a live call.",
  };
  return Promise.resolve(result);
}
