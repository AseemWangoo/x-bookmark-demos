import OpenAI from "openai";
import type { InboxMessage, NormalizedAnswers, Strategy } from "../src/lib/types.ts";
import type { DecisionAnswer, DecisionPayload } from "./schema.ts";
import { levelLabelForIndex, TRIAGE_QUESTIONS } from "./questions.ts";
import { renderMessage, renderPackedInput } from "./render.ts";

/**
 * Adapter for POST /v1/decisions.
 * Field names follow the Decisions guide and openai@7.39.0 `Decision` / `DecisionCreateParams`.
 * https://developers.openai.com/api/docs/guides/decisions
 * https://developers.openai.com/api/reference/typescript/resources/decisions/methods/create
 *
 * Question cap is 400 per the guide (GA, 2026-10-22). The installed SDK comment still says 1–200.
 */

export const MAX_DECISION_QUESTIONS = 400;
export const PREDICATE_CUTOFF = 0.5;

type DecisionCreateParams = OpenAI.DecisionCreateParams;
type QuestionParam = DecisionCreateParams["questions"][number];

export type DecisionsClient = {
  decisions?: {
    create: (body: DecisionCreateParams) => Promise<DecisionPayload> & {
      withResponse?: () => Promise<{ data: DecisionPayload; response: Response }>;
    };
  };
  post?: (path: string, opts: { body: unknown }) => Promise<unknown>;
  apiKey?: string;
  baseURL?: string;
};

function questionParams(messageId?: string): QuestionParam[] {
  const scope = (instructions: string) =>
    messageId ? `For the message with id ${messageId}: ${instructions}` : instructions;
  const name = (question: string) => (messageId ? `${messageId}.${question}` : question);
  return [
    {
      type: "predicate",
      name: name("urgent"),
      instructions: scope(TRIAGE_QUESTIONS.urgent.instructions),
    },
    {
      type: "choice",
      name: name("route"),
      instructions: scope(TRIAGE_QUESTIONS.route.instructions),
      choices: TRIAGE_QUESTIONS.route.choices.map((choice) => ({
        value: choice.value,
        description: choice.description,
      })),
    },
    {
      type: "score",
      name: name("priority"),
      instructions: scope(TRIAGE_QUESTIONS.priority.instructions),
      levels: TRIAGE_QUESTIONS.priority.levels.map((level) => ({
        label: level.label,
        description: level.description,
      })),
    },
  ];
}

export function buildDecisionRequest(
  input: InboxMessage | InboxMessage[],
  strategy: Strategy,
  model = "gpt-6-luna",
): DecisionCreateParams {
  if (strategy === "per_message") {
    const message = Array.isArray(input) ? input[0] : input;
    if (!message || (Array.isArray(input) && input.length !== 1)) {
      throw new Error("per_message builds one request for exactly one message");
    }
    return {
      model,
      input: renderMessage(message),
      questions: questionParams(),
    };
  }

  const messages = Array.isArray(input) ? input : [input];
  const questions = messages.flatMap((message) => questionParams(message.id));
  if (questions.length > MAX_DECISION_QUESTIONS) {
    throw new Error(
      `Packed strategy allows at most ${MAX_DECISION_QUESTIONS} questions (about ${Math.floor(MAX_DECISION_QUESTIONS / 3)} messages at 3 questions each). This batch has ${questions.length}.`,
    );
  }
  return {
    model,
    input: renderPackedInput(messages),
    questions,
  };
}

function logProcessingHeader(response: Response, source: string): void {
  const value = response.headers.get("openai-processing-ms");
  if (value) console.info(`${source} openai-processing-ms=${value}`);
}

export async function callDecisions(
  client: DecisionsClient,
  body: DecisionCreateParams,
): Promise<{ raw: DecisionPayload; latencyMs: number }> {
  const started = performance.now();
  const raw = await invokeDecisions(client, body);
  return { raw, latencyMs: performance.now() - started };
}

async function invokeDecisions(client: DecisionsClient, body: DecisionCreateParams): Promise<DecisionPayload> {
  const create = client.decisions?.create;
  if (create) {
    const pending = create(body);
    if (typeof pending.withResponse === "function") {
      const { data, response } = await pending.withResponse();
      logProcessingHeader(response, "decisions");
      return data;
    }
    return pending;
  }

  if (typeof client.post === "function") {
    const raw = await client.post("/decisions", { body });
    return raw as DecisionPayload;
  }

  const apiKey = client.apiKey;
  if (!apiKey) throw new Error("Missing API key for the Decisions request");
  const baseURL = (client.baseURL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseURL}/decisions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  logProcessingHeader(response, "decisions");
  if (!response.ok) {
    const text = (await response.text()).slice(0, 500);
    const error = new Error(text || `Decisions request failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return (await response.json()) as DecisionPayload;
}

export function blankAnswers(): NormalizedAnswers {
  return {
    urgent: { probability: null, value: null, refused: false, unrecognised: false },
    route: { choice: null, confidence: null, probabilities: null, refused: false, unrecognised: false },
    priority: { score: null, level: null, confidence: null, probabilities: null, refused: false, unrecognised: false },
  };
}

type QuestionName = "urgent" | "route" | "priority";

function questionName(value: string): QuestionName | null {
  if (value === "urgent" || value === "route" || value === "priority") return value;
  return null;
}

function splitAnswerName(
  name: string | null,
  strategy: Strategy,
  messageId?: string,
): { id: string; question: QuestionName } | null {
  if (!name) return null;
  if (strategy === "packed") {
    const dot = name.lastIndexOf(".");
    if (dot <= 0) return null;
    const question = questionName(name.slice(dot + 1));
    if (!question) return null;
    return { id: name.slice(0, dot), question };
  }
  if (!messageId) return null;
  const question = questionName(name);
  if (!question) return null;
  return { id: messageId, question };
}

function applyAnswer(target: NormalizedAnswers, answer: DecisionAnswer): void {
  switch (answer.type) {
    case "predicate":
      target.urgent = {
        probability: answer.probability,
        value: answer.probability >= PREDICATE_CUTOFF,
        refused: false,
        unrecognised: false,
      };
      return;
    case "choice":
      target.route = {
        choice: answer.choice,
        confidence: answer.confidence ?? null,
        probabilities: answer.probabilities,
        refused: false,
        unrecognised: false,
      };
      return;
    case "score": {
      const display = answer.score + 1;
      target.priority = {
        score: display,
        level: levelLabelForIndex(Math.round(answer.score)),
        confidence: answer.confidence ?? null,
        probabilities: answer.probabilities,
        refused: false,
        unrecognised: false,
      };
      return;
    }
    case "refusal": {
      const slot = refusalSlot(answer.name);
      if (slot === "urgent") {
        target.urgent = { probability: null, value: null, refused: true, unrecognised: false };
      } else if (slot === "route") {
        target.route = { choice: null, confidence: null, probabilities: null, refused: true, unrecognised: false };
      } else if (slot === "priority") {
        target.priority = {
          score: null,
          level: null,
          confidence: null,
          probabilities: null,
          refused: true,
          unrecognised: false,
        };
      }
      return;
    }
    default: {
      const unexpected: never = answer;
      void unexpected;
    }
  }
}

function refusalSlot(name: string | null): QuestionName | null {
  if (!name) return null;
  const dot = name.lastIndexOf(".");
  return questionName(dot === -1 ? name : name.slice(dot + 1));
}

export type NormalizedDecisionRow = {
  id: string;
  answers: NormalizedAnswers;
};

export function normalizeDecision(
  raw: { answers: Array<DecisionAnswer | { type: string; name?: string | null }> },
  strategy: Strategy,
  messageId?: string,
): NormalizedDecisionRow[] {
  const rows = new Map<string, NormalizedAnswers>();
  const ensure = (id: string) => {
    const existing = rows.get(id);
    if (existing) return existing;
    const created = blankAnswers();
    rows.set(id, created);
    return created;
  };

  for (const answer of raw.answers) {
    const named = splitAnswerName(answer.name ?? null, strategy, messageId);
    if (!named) continue;
    const target = ensure(named.id);
    if (!isKnownAnswer(answer)) {
      markUnrecognised(target, named.question);
      continue;
    }
    if (answer.type === "refusal") {
      applyAnswer(target, { ...answer, name: answer.name });
      continue;
    }
    if (named.question === "urgent" && answer.type !== "predicate") {
      markUnrecognised(target, "urgent");
      continue;
    }
    if (named.question === "route" && answer.type !== "choice") {
      markUnrecognised(target, "route");
      continue;
    }
    if (named.question === "priority" && answer.type !== "score") {
      markUnrecognised(target, "priority");
      continue;
    }
    applyAnswer(target, answer);
  }

  return [...rows.entries()].map(([id, answers]) => ({ id, answers }));
}

function isKnownAnswer(answer: { type: string }): answer is DecisionAnswer {
  return answer.type === "predicate" || answer.type === "choice" || answer.type === "score" || answer.type === "refusal";
}

function markUnrecognised(target: NormalizedAnswers, question: QuestionName): void {
  if (question === "urgent") {
    target.urgent = { probability: null, value: null, refused: false, unrecognised: true };
    return;
  }
  if (question === "route") {
    target.route = { choice: null, confidence: null, probabilities: null, refused: false, unrecognised: true };
    return;
  }
  target.priority = {
    score: null,
    level: null,
    confidence: null,
    probabilities: null,
    refused: false,
    unrecognised: true,
  };
}

export function asDecisionsClient(client: OpenAI): DecisionsClient {
  return client as unknown as DecisionsClient;
}
