import { HOSTED_BLOCKED, LIVE_REQUIRED, RECORDED_LABEL, TURN_CAP } from "../shared/copy.ts";
import { RECORDED_METRICS, RECORDED_STEPS } from "../shared/fixtures/recorded.ts";
import { tokensPerSec, tokensPerSecLabel } from "../shared/metrics.ts";
import type { AgentEvent, AgentResult, PocketFile, RootId, TraceEntry, Usage } from "../shared/types.ts";
import type { PocketEnv } from "./env.ts";
import { isLoopbackBaseUrl } from "./env.ts";
import { executeTool, isToolName, listPocket } from "./tools.ts";
import type { ToolOutcome } from "./tools.ts";

function emptyResult(partial: {
  files: PocketFile[];
  source: AgentResult["source"];
  model: string;
  endpointHost: string | null;
  offline: boolean;
  recorded: boolean;
  message: string | null;
  trace?: TraceEntry[];
  summaryPath?: string | null;
  summaryMarkdown?: string | null;
  ttftMs?: number | null;
  tokensPerSec?: number | null;
  usage?: Usage | null;
  turns?: number;
  wallMs?: number | null;
}): AgentResult {
  const rate = partial.tokensPerSec ?? null;
  return {
    trace: partial.trace ?? [],
    files: partial.files,
    summaryPath: partial.summaryPath ?? null,
    summaryMarkdown: partial.summaryMarkdown ?? null,
    ttftMs: partial.ttftMs ?? null,
    tokensPerSec: rate,
    tokensPerSecLabel: tokensPerSecLabel(rate),
    usage: partial.usage ?? null,
    turns: partial.turns ?? 0,
    wallMs: partial.wallMs ?? null,
    source: partial.source,
    endpointHost: partial.endpointHost,
    offline: partial.offline,
    model: partial.model,
    message: partial.message,
    recorded: partial.recorded,
  };
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* runMock(input: {
  root: string;
  rootId: RootId;
  model: string;
  delayMs: number;
}): AsyncGenerator<AgentEvent> {
  if (input.rootId === "custom") {
    const files = await listPocket(input.root);
    yield { type: "files", files };
    yield {
      type: "result",
      result: emptyResult({
        files,
        source: "mock",
        model: input.model,
        endpointHost: null,
        offline: false,
        recorded: true,
        message: LIVE_REQUIRED,
      }),
    };
    return;
  }
  if (input.rootId !== "fixture") {
    const neverId: never = input.rootId;
    throw new Error(`unknown root ${neverId}`);
  }

  const trace: TraceEntry[] = [];
  let summary: { path: string; markdown: string } | null = null;
  let stepIndex = 0;
  for (const step of RECORDED_STEPS) {
    stepIndex += 1;
    const outcome = await executeTool(input.root, step.name, step.args);
    const excerpt = step.caption ?? outcome.excerpt;
    const entry: TraceEntry = {
      id: `recorded-${stepIndex}`,
      name: step.name,
      args: step.args,
      resultExcerpt: excerpt,
      durationMs: step.durationMs,
      highlightPath: outcome.highlightPath,
    };
    trace.push(entry);
    yield { type: "trace", entry };
    if (outcome.summary) {
      summary = outcome.summary;
      yield { type: "summary", path: outcome.summary.path, markdown: outcome.summary.markdown };
    }
    const files = await listPocket(input.root);
    yield { type: "files", files };
    await sleep(input.delayMs);
  }

  const files = await listPocket(input.root);
  const rate = tokensPerSec({
    completionTokens: RECORDED_METRICS.usage.outputTokens,
    ttftMs: RECORDED_METRICS.ttftMs,
    wallMs: RECORDED_METRICS.wallMs,
  });
  yield {
    type: "result",
    result: emptyResult({
      files,
      trace,
      source: "mock",
      model: RECORDED_METRICS.model,
      endpointHost: null,
      offline: false,
      recorded: true,
      message: RECORDED_LABEL,
      summaryPath: summary?.path ?? null,
      summaryMarkdown: summary?.markdown ?? null,
      ttftMs: RECORDED_METRICS.ttftMs,
      tokensPerSec: rate,
      usage: RECORDED_METRICS.usage,
      turns: RECORDED_METRICS.turns,
      wallMs: RECORDED_METRICS.wallMs,
    }),
  };
}

export function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    const parsed: unknown = JSON.parse(raw.trim() === "" ? "{}" : raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("tool arguments must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  throw new Error("tool arguments must be a JSON object or string");
}

export function assertLoopbackTarget(env: PocketEnv): void {
  if (env.mode !== "live" || !env.baseUrl || !env.offline || !isLoopbackBaseUrl(env.baseUrl)) {
    throw new Error(HOSTED_BLOCKED);
  }
}

export function traceFromOutcome(input: {
  id: string;
  name: TraceEntry["name"];
  args: Record<string, unknown>;
  outcome: ToolOutcome;
  durationMs: number;
}): TraceEntry {
  return {
    id: input.id,
    name: input.name,
    args: input.args,
    resultExcerpt: input.outcome.excerpt,
    durationMs: input.durationMs,
    highlightPath: input.outcome.highlightPath,
  };
}

export { TURN_CAP, isToolName };
