import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { zodTextFormat } from "openai/helpers/zod";

import {
  SHORT_CONTEXT_NOTE,
  ULTRAFAST_LIST_NOTE,
  ULTRAFAST_PROMO_LABEL,
  type ServiceTier,
} from "../../shared/copy.ts";
import type { AssembleResult } from "../../shared/result.ts";
import { assemblySchema } from "../../shared/schema.ts";
import { costUsd, estimateUsage, usageFromPayload } from "../cost.ts";
import { modelIdFor } from "../env.ts";
import { AssembleError, type AssembleJob, type AssemblyAdapter } from "./types.ts";

export const DEVELOPER_INSTRUCTIONS = `You convert a parts list, build steps, or a photo of parts into one assembly guide as JSON.

The guide is rendered in a browser with primitive meshes only: box, cylinder, sphere, and cone. There is no CAD, no GLTF, and no generated photography.

Rules:
- title: short name of the build.
- summary: one or two sentences describing the assembled object.
- parts: 4 to 12 parts. Each part is one mesh.
- id: a unique slug.
- qty: how many of that part the kit contains. The mesh is the representative instance.
- description: one sentence.
- color: a #RRGGBB hex string.
- shape: box, cylinder, sphere, or cone.
- size: [x, y, z] in scene units, each between 0.04 and 2.5.
  box is width, height, depth.
  cylinder is [radius, height, radius].
  sphere is [radius, radius, radius].
  cone is [radius, height, radius]. The cone points up the Y axis before rotation.
- rotation: [x, y, z] radians. [0, 0, 0] keeps the three.js default, cylinders and cones along Y. [0, 0, 1.570796] lays a cylinder along X for wheels and axles. [1.570796, 0, 0] lays a cylinder along Z.
- assembledPosition and explodedPosition: [x, y, z]. Assembled parts form one object near the origin, about -1.2 to 1.2 on each axis. Exploded positions separate parts by about 0.6 to 1.8 units and stay near the origin.
- steps: ordered build steps. n starts at 1. partIds lists parts attached in that step. Every part id appears in at least one step.

If the input is not an assembly, refuse. Do not claim the meshes are a manufacturer's CAD.`;

const USER_IMAGE_FALLBACK = "Read the attached photo and return the assembly JSON.";

export function buildResponsesParams(input: {
  model: string;
  serviceTier: ServiceTier;
  sourceText: string;
  imageDataUrl?: string;
}): ResponseCreateParamsNonStreaming {
  const text = input.sourceText.trim() || USER_IMAGE_FALLBACK;
  const userContent = input.imageDataUrl
    ? [
        { type: "input_text" as const, text },
        {
          type: "input_image" as const,
          image_url: input.imageDataUrl,
          detail: "auto" as const,
        },
      ]
    : text;
  return {
    model: input.model,
    service_tier: input.serviceTier,
    reasoning: { effort: "low" },
    max_output_tokens: 8000,
    input: [
      { role: "developer", content: DEVELOPER_INSTRUCTIONS },
      { role: "user", content: userContent },
    ],
    text: { format: zodTextFormat(assemblySchema, "assembly") },
  };
}

export function createOpenAIAdapter(env: NodeJS.ProcessEnv): AssemblyAdapter {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY?.trim(),
    timeout: 120_000,
  });
  return {
    mode: "live",
    async run(job) {
      return runLive(client, env, job);
    },
  };
}

async function runLive(
  client: OpenAI,
  env: NodeJS.ProcessEnv,
  job: AssembleJob,
): Promise<AssembleResult> {
  const model = modelIdFor(job.modelKey, env);
  const sourceText = job.sourceText?.trim() ?? "";
  if (!sourceText && !job.imageDataUrl) {
    throw new AssembleError("Add a parts list or a photo.", 400);
  }
  const params = buildResponsesParams({
    model,
    serviceTier: job.serviceTier,
    sourceText,
    imageDataUrl: job.imageDataUrl,
  });
  const started = performance.now();
  let response: Awaited<ReturnType<typeof client.responses.parse>>;
  try {
    response = await client.responses.parse(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Responses request failed.";
    throw new AssembleError(message, 502);
  }
  const latencyMs = Math.round(performance.now() - started);
  if (response.status && response.status !== "completed") {
    const reason = response.error?.message ?? response.incomplete_details?.reason ?? response.status;
    throw new AssembleError(`Response ${response.status}: ${reason}`, 502);
  }
  if (!response.output_parsed) {
    throw new AssembleError(refusalText(response) ?? "The model returned no assembly.", 502);
  }
  const assembly = assemblySchema.parse(response.output_parsed);
  const fallback = `${sourceText}\n${JSON.stringify(assembly)}`;
  const usage = usageFromPayload(response.usage, fallback);
  const priced = usage.estimated ? estimateUsage(fallback) : usage;
  const quote = costUsd(job.modelKey, job.serviceTier, priced);
  const actualTier = response.service_tier ?? "missing";
  return {
    modelKey: job.modelKey,
    model,
    source: "live",
    assembly,
    latencyMs,
    usage: priced,
    costUsd: quote.usd,
    costEstimated: quote.estimated,
    costMultiplier: quote.multiplier,
    ultrafastPromo: quote.ultrafastPromo,
    requestedTier: job.serviceTier,
    actualTier,
    tierNote: actualTierNote(actualTier),
    metricsNote: quote.estimated
      ? `Usage was missing on the response, so tokens are a labelled estimate (about 4 characters per token). ${SHORT_CONTEXT_NOTE}`
      : liveMetricsNote(quote.ultrafastPromo),
  };
}

function liveMetricsNote(promo: boolean): string {
  if (promo) return `${ULTRAFAST_PROMO_LABEL}. ${ULTRAFAST_LIST_NOTE} ${SHORT_CONTEXT_NOTE}`;
  return SHORT_CONTEXT_NOTE;
}

export function actualTierNote(actualTier: string): string {
  if (actualTier === "priority") {
    return "The API returned priority, the legacy alias of Fast. This desk requested a service_tier and does not offer priority as a choice.";
  }
  if (actualTier === "missing") {
    return "The response did not include service_tier.";
  }
  return "Returned service_tier from the Responses API. It can differ from the request, including a Fast downgrade to default.";
}

function refusalText(response: { output?: ReadonlyArray<{ type?: string; content?: ReadonlyArray<{ type?: string; refusal?: string }> }> }): string | null {
  for (const item of response.output ?? []) {
    if (item.type !== "message" || !item.content) continue;
    for (const part of item.content) {
      if (part.type === "refusal" && part.refusal) return part.refusal;
    }
  }
  return null;
}
