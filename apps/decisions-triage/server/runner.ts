import { decisionsCostUsd, responsesCostUsd } from "../src/lib/pricing.ts";
import {
  DECISIONS_CONCURRENCY,
  emptyUsage,
  scheduledBatchMs,
  sumUsage,
} from "../src/lib/metrics.ts";
import type {
  InboxMessage,
  Strategy,
  TriageBatch,
  TriageError,
  TriageResponse,
  TriageRow,
  Usage,
} from "../src/lib/types.ts";
import { blankAnswers, buildDecisionRequest, callDecisions, normalizeDecision, asDecisionsClient } from "./decisions.ts";
import type { DecisionPayload } from "./schema.ts";
import { errorParts } from "./errors.ts";
import { readEnv, type ServerEnv } from "./env.ts";
import { replayDecision, replayPacked, replayResponse } from "./mock.ts";
import { mapPool } from "./pool.ts";
import { createOpenAIClient } from "./openai.ts";
import {
  asResponsesClient,
  buildResponsesRequest,
  callResponses,
  normalizeResponse,
  type ResponsesPayload,
} from "./responses.ts";

type DecisionCall = { raw: DecisionPayload; latencyMs: number };

function usageOf(raw: DecisionPayload): Usage {
  return raw.usage;
}

function rowFromDecision(
  id: string,
  answers: TriageRow["answers"],
  latencyMs: number,
  usage: Usage | null,
  raw: unknown,
): TriageRow {
  return { id, answers, latencyMs, usage, raw };
}

export async function executeDecisions(options: {
  messages: InboxMessage[];
  strategy: Strategy;
  synthetic: boolean;
  secret: string | null;
  perMessage: (message: InboxMessage) => Promise<DecisionCall>;
  packed: (messages: InboxMessage[]) => Promise<DecisionCall>;
}): Promise<{ rows: TriageRow[]; errors: TriageError[]; batchMs: number; usage: Usage }> {
  const started = performance.now();
  if (options.strategy === "packed") {
    try {
      const result = await options.packed(options.messages);
      const normalized = normalizeDecision(result.raw, "packed");
      const rows = options.messages.map((message) => {
        const found = normalized.find((row) => row.id === message.id);
        const answers = found?.answers ?? blankAnswers();
        const own = result.raw.answers.filter((answer) => answer.name?.startsWith(`${message.id}.`));
        return rowFromDecision(message.id, answers, result.latencyMs, null, {
          model: result.raw.model,
          answers: own,
        });
      });
      return {
        rows,
        errors: [],
        batchMs: options.synthetic ? result.latencyMs : performance.now() - started,
        usage: usageOf(result.raw),
      };
    } catch (error) {
      const parts = errorParts(error, options.secret);
      return {
        rows: [],
        errors: options.messages.map((message) => ({
          id: message.id,
          source: "decisions",
          status: parts.status,
          message: parts.message,
        })),
        batchMs: options.synthetic ? 0 : performance.now() - started,
        usage: emptyUsage(),
      };
    }
  }

  const outcomes = await mapPool(options.messages, DECISIONS_CONCURRENCY, async (message) => {
    try {
      const result = await options.perMessage(message);
      const [normalized] = normalizeDecision(result.raw, "per_message", message.id);
      return {
        ok: true as const,
        row: rowFromDecision(
          message.id,
          normalized?.answers ?? blankAnswers(),
          result.latencyMs,
          usageOf(result.raw),
          { model: result.raw.model, answers: result.raw.answers },
        ),
      };
    } catch (error) {
      const parts = errorParts(error, options.secret);
      return {
        ok: false as const,
        error: {
          id: message.id,
          source: "decisions" as const,
          status: parts.status,
          message: parts.message,
        },
      };
    }
  });

  const rows = outcomes.flatMap((outcome) => (outcome.ok ? [outcome.row] : []));
  const errors = outcomes.flatMap((outcome) => (outcome.ok ? [] : [outcome.error]));
  const illustrative = scheduledBatchMs(
    options.messages.map((message) => {
      const row = rows.find((item) => item.id === message.id);
      return row?.latencyMs ?? 0;
    }),
    DECISIONS_CONCURRENCY,
  );
  return {
    rows,
    errors,
    batchMs: options.synthetic ? illustrative : performance.now() - started,
    usage: sumUsage(rows.flatMap((row) => (row.usage ? [row.usage] : []))),
  };
}

export async function executeResponses(options: {
  messages: InboxMessage[];
  synthetic: boolean;
  secret: string | null;
  reasoningEffort: string;
  call: (message: InboxMessage) => Promise<{ raw: ResponsesPayload; latencyMs: number }>;
}): Promise<{ rows: TriageRow[]; errors: TriageError[]; batchMs: number; usage: Usage }> {
  const started = performance.now();
  const outcomes = await mapPool(options.messages, DECISIONS_CONCURRENCY, async (message) => {
    try {
      const result = await options.call(message);
      const answers = normalizeResponse(result.raw.output_text ?? "");
      const usage = normalizeUsage(result.raw.usage);
      return {
        ok: true as const,
        row: rowFromDecision(message.id, answers, result.latencyMs, usage, {
          output_text: result.raw.output_text ?? "",
        }),
      };
    } catch (error) {
      const parts = errorParts(error, options.secret);
      return {
        ok: false as const,
        error: {
          id: message.id,
          source: "responses" as const,
          status: parts.status,
          message: parts.message,
        },
      };
    }
  });
  const rows = outcomes.flatMap((outcome) => (outcome.ok ? [outcome.row] : []));
  const errors = outcomes.flatMap((outcome) => (outcome.ok ? [] : [outcome.error]));
  const illustrative = scheduledBatchMs(
    rows.map((row) => row.latencyMs),
    DECISIONS_CONCURRENCY,
  );
  return {
    rows,
    errors,
    batchMs: options.synthetic ? illustrative : performance.now() - started,
    usage: sumUsage(rows.flatMap((row) => (row.usage ? [row.usage] : []))),
  };
}

function normalizeUsage(usage: ResponsesPayload["usage"]): Usage {
  return {
    input_tokens: usage?.input_tokens ?? 0,
    input_tokens_details: {
      cached_tokens: usage?.input_tokens_details?.cached_tokens ?? 0,
      cache_write_tokens: usage?.input_tokens_details?.cache_write_tokens ?? 0,
    },
    output_tokens: usage?.output_tokens ?? 0,
    output_tokens_details: {
      reasoning_tokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
    },
    total_tokens: usage?.total_tokens ?? 0,
  };
}

function toBatch(
  result: { rows: TriageRow[]; batchMs: number; usage: Usage },
  synthetic: boolean,
  cost: number,
  reasoningEffort?: string,
): TriageBatch {
  return {
    rows: result.rows,
    batchMs: result.batchMs,
    usage: result.usage,
    costUsd: cost,
    synthetic: synthetic ? true : undefined,
    reasoningEffort,
  };
}

export async function runTriage(request: {
  messages: InboxMessage[];
  strategy: Strategy;
  compare: boolean;
  forceMock?: boolean;
}): Promise<TriageResponse> {
  const env = readEnv();
  const synthetic = env.mode === "mock" || request.forceMock === true;
  if (synthetic) return runSynthetic(request, env);
  return runLive(request, env);
}

async function runSynthetic(
  request: { messages: InboxMessage[]; strategy: Strategy; compare: boolean },
  env: ServerEnv,
): Promise<TriageResponse> {
  const decisionsPromise = executeDecisions({
    messages: request.messages,
    strategy: request.strategy,
    synthetic: true,
    secret: null,
    perMessage: replayDecision,
    packed: replayPacked,
  });
  const comparedPromise = request.compare
    ? executeResponses({
        messages: request.messages,
        synthetic: true,
        secret: null,
        reasoningEffort: env.reasoningEffort,
        call: async (message) => {
          const replayed = await replayResponse(message);
          return { raw: replayed.raw, latencyMs: replayed.latencyMs };
        },
      })
    : Promise.resolve(null);
  const [decisions, compared] = await Promise.all([decisionsPromise, comparedPromise]);
  const errors = [...decisions.errors];
  let responses: TriageBatch | undefined;
  if (compared) {
    errors.push(...compared.errors);
    responses = toBatch(compared, true, responsesCostUsd(compared.usage), env.reasoningEffort);
  }
  return {
    mode: "mock",
    strategy: request.strategy,
    decisions: toBatch(decisions, true, decisionsCostUsd(decisions.usage)),
    responses,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function runLive(
  request: { messages: InboxMessage[]; strategy: Strategy; compare: boolean },
  env: ServerEnv,
): Promise<TriageResponse> {
  if (!env.apiKey) throw new Error("Live mode requires OPENAI_API_KEY");
  const client = createOpenAIClient(env.apiKey, env.baseURL);
  const decisionsClient = asDecisionsClient(client);
  const responsesClient = asResponsesClient(client);
  const decisionsPromise = executeDecisions({
    messages: request.messages,
    strategy: request.strategy,
    synthetic: false,
    secret: env.apiKey,
    perMessage: async (message) => {
      const body = buildDecisionRequest(message, "per_message", env.model);
      return callDecisions(decisionsClient, body);
    },
    packed: async (messages) => {
      const body = buildDecisionRequest(messages, "packed", env.model);
      return callDecisions(decisionsClient, body);
    },
  });
  const comparedPromise = request.compare
    ? executeResponses({
        messages: request.messages,
        synthetic: false,
        secret: env.apiKey,
        reasoningEffort: env.reasoningEffort,
        call: async (message) => {
          const body = buildResponsesRequest(message, env.reasoningEffort, env.model);
          return callResponses(responsesClient, body);
        },
      })
    : Promise.resolve(null);
  const [decisions, compared] = await Promise.all([decisionsPromise, comparedPromise]);
  const errors = [...decisions.errors];
  let responses: TriageBatch | undefined;
  if (compared) {
    errors.push(...compared.errors);
    responses = toBatch(compared, false, responsesCostUsd(compared.usage), env.reasoningEffort);
  }
  return {
    mode: "live",
    strategy: request.strategy,
    decisions: toBatch(decisions, false, decisionsCostUsd(decisions.usage)),
    responses,
    errors: errors.length > 0 ? errors : undefined,
  };
}
