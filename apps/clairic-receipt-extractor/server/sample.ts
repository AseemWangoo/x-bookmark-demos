import { clairicCostUsd, llmCostUsd } from "../src/lib/pricing.ts";
import {
  UNRECORDED,
  isUnrecorded,
  type Answer,
  type ExtractRequest,
  type ExtractResponse,
  type FieldResult,
  type FieldSpec,
  type Fixture,
  type ModelRun,
  type TokenUsage,
} from "../src/lib/types.ts";
import { listFixtures } from "./catalog.ts";
import { fixtureRecordings, type FixtureRecordingFile } from "./fixture-data.ts";
import { parseAnswer } from "./normalize.ts";

export const SAMPLE_DELAY_SCALE = 0.2;
export const SAMPLE_DELAY_MIN_MS = 40;
export const SAMPLE_DELAY_MAX_MS = 800;

export function scaledDelayMs(recordedMs: number): number {
  const scaled = Math.round(recordedMs * SAMPLE_DELAY_SCALE);
  return Math.min(SAMPLE_DELAY_MAX_MS, Math.max(SAMPLE_DELAY_MIN_MS, scaled));
}

export async function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type Recording = {
  synthetic?: boolean;
  latencyMs: number;
  model: string;
  truncated?: boolean;
  usage: TokenUsage;
  answers: Record<string, Answer>;
};

export async function sampleExtract(
  request: ExtractRequest,
  sleep: (ms: number) => Promise<void> = defaultSleep,
): Promise<ExtractResponse> {
  const fixture = matchFixture(request);
  const clairicRecording = fixture ? readRecording(fixture.id, "clairic") : null;
  const llmRecording = fixture && request.compare ? readRecording(fixture.id, "llm") : null;
  const clairicAnswers = replay(request.fields, clairicRecording?.answers ?? null);
  const llmAnswers = request.compare ? replay(request.fields, llmRecording?.answers ?? null) : null;
  const clairicHit = Object.values(clairicAnswers).some((answer) => !isUnrecorded(answer));
  const llmHit = llmAnswers
    ? Object.values(llmAnswers).some((answer) => !isUnrecorded(answer))
    : false;

  await Promise.all([
    sleep(clairicHit && clairicRecording ? scaledDelayMs(clairicRecording.latencyMs) : 0),
    sleep(llmHit && llmRecording ? scaledDelayMs(llmRecording.latencyMs) : 0),
  ]);

  const clairic = toRun(clairicRecording, clairicAnswers, clairicHit, "clairic");
  const response: ExtractResponse = { mode: "sample", clairic };
  if (request.compare && llmAnswers) {
    response.llm = toRun(llmRecording, llmAnswers, llmHit, "llm");
  }
  return response;
}

function matchFixture(request: ExtractRequest): Fixture | null {
  const fixtures = listFixtures();
  if (request.fixtureId) {
    const named = fixtures.find((fixture) => fixture.id === request.fixtureId);
    if (named && named.source === request.source) return named;
    return null;
  }
  return fixtures.find((fixture) => fixture.source === request.source) ?? null;
}

function readRecording(id: string, kind: "clairic" | "llm"): Recording {
  const raw = fixtureRecordings[id]?.[kind];
  if (!raw) throw new Error(`missing recording ${id}.${kind}`);
  const answers: Record<string, Answer> = {};
  for (const [name, answer] of Object.entries(raw.answers)) {
    answers[name] = parseAnswer(answer);
  }
  return {
    synthetic: raw.synthetic,
    latencyMs: raw.latencyMs,
    model: raw.model,
    truncated: raw.truncated,
    usage: usageOf(raw),
    answers,
  };
}

function usageOf(raw: FixtureRecordingFile): TokenUsage {
  const usage = raw.usage;
  if (
    usage.state_tokens !== undefined &&
    usage.image_tokens !== undefined &&
    usage.schema_tokens !== undefined &&
    usage.passes !== undefined
  ) {
    return {
      state_tokens: usage.state_tokens,
      image_tokens: usage.image_tokens,
      schema_tokens: usage.schema_tokens,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      passes: usage.passes,
    };
  }
  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  };
}

function replay(
  fields: FieldSpec[],
  recorded: Record<string, Answer> | null,
): Record<string, FieldResult> {
  const answers: Record<string, FieldResult> = {};
  for (const field of fields) {
    const answer = recorded?.[field.name];
    if (!answer || answer.type !== field.type) {
      answers[field.name] = UNRECORDED;
      continue;
    }
    answers[field.name] = answer;
  }
  return answers;
}

function toRun(
  recording: Recording | null,
  answers: Record<string, FieldResult>,
  hit: boolean,
  kind: "clairic" | "llm",
): ModelRun {
  const usage = hit && recording ? recording.usage : null;
  const costUsd = usage ? costFor(kind, usage) : null;
  return {
    model: recording?.model ?? (kind === "clairic" ? "clairic" : "llm"),
    answers,
    usage,
    latencyMs: hit && recording ? recording.latencyMs : 0,
    costUsd,
    synthetic: hit && recording?.synthetic === true ? true : undefined,
    truncated: recording?.truncated,
  };
}

function costFor(kind: "clairic" | "llm", usage: TokenUsage): number {
  if (kind === "clairic") return clairicCostUsd(usage.input_tokens);
  const output = "output_tokens" in usage ? usage.output_tokens : 0;
  return llmCostUsd(usage.input_tokens, output);
}
