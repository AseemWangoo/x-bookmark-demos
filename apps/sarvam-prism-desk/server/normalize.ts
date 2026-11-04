import type { RoutingResult } from "../src/lib/types";
import { choiceAnswerSchema, noulAnswerSchema, scoreAnswerSchema } from "./schema";

export type NormalizedAnswer =
  | {
      kind: "noul";
      pYes: number;
    }
  | {
      kind: "choice";
      choice: string;
      pTop: number;
      confidence: number;
      probabilities: Record<string, number>;
    }
  | {
      kind: "score";
      score: number;
      label: string;
      confidence: number;
      probabilities: Record<string, number>;
      legend: Record<string, string>;
    }
  | {
      kind: "unknown";
      type: string;
      raw: unknown;
    };

export function normalizeAnswer(value: unknown): NormalizedAnswer {
  const noul = noulAnswerSchema.safeParse(value);
  if (noul.success) return { kind: "noul", pYes: noul.data.noul };

  const choice = choiceAnswerSchema.safeParse(value);
  if (choice.success) {
    const pTop = choice.data.probabilities[choice.data.choice] ?? 0;
    return {
      kind: "choice",
      choice: choice.data.choice,
      pTop,
      confidence: choice.data.confidence,
      probabilities: choice.data.probabilities,
    };
  }

  const score = scoreAnswerSchema.safeParse(value);
  if (score.success) {
    const label = score.data.legend[String(Math.round(score.data.score))] ?? "";
    return {
      kind: "score",
      score: score.data.score,
      label,
      confidence: score.data.confidence,
      probabilities: score.data.probabilities,
      legend: score.data.legend,
    };
  }

  const type =
    typeof value === "object" && value !== null && "type" in value
      ? String(value.type)
      : "unknown";
  return { kind: "unknown", type, raw: value };
}

export function normalizeAnswers(answers: Record<string, unknown>): Record<string, NormalizedAnswer> {
  const byId: Record<string, NormalizedAnswer> = {};
  for (const [id, value] of Object.entries(answers)) {
    byId[id] = normalizeAnswer(value);
  }
  return byId;
}

export function toRoutingResult(byId: Record<string, NormalizedAnswer>): RoutingResult {
  const team = byId.team;
  const urgency = byId.urgency;
  const escalate = byId.escalate;
  if (!team || team.kind !== "choice") throw new Error("Response is missing a choice answer for team");
  if (!urgency || urgency.kind !== "score") throw new Error("Response is missing a score answer for urgency");
  if (!escalate || escalate.kind !== "noul") throw new Error("Response is missing a noul answer for escalate");
  const verdict = escalate.pYes >= 0.5 ? "yes" : "no";
  return {
    team: {
      choice: team.choice,
      pTop: team.pTop,
      confidence: team.confidence,
      probabilities: team.probabilities,
    },
    urgency: {
      score: urgency.score,
      level: Math.round(urgency.score),
      label: urgency.label,
      confidence: urgency.confidence,
      probabilities: urgency.probabilities,
      legend: urgency.legend,
    },
    escalate: { pYes: escalate.pYes, verdict },
  };
}
