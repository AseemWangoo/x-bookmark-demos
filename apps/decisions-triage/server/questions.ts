import type { RouteValue } from "../src/lib/types.ts";

export const ROUTE_CHOICES: { value: RouteValue; description: string }[] = [
  {
    value: "billing",
    description: "Payments, invoices, refunds, and plan charges.",
  },
  {
    value: "bug",
    description: "Product defects, outages, and security issues.",
  },
  {
    value: "sales",
    description: "New purchases, quotes, and seat expansion.",
  },
  {
    value: "spam",
    description: "Unsolicited, phishing, or irrelevant messages.",
  },
];

export const PRIORITY_LEVELS: { label: string; description: string }[] = [
  {
    label: "P1 Trivial",
    description: "Cosmetic or irrelevant. No customer impact.",
  },
  {
    label: "P2 Low",
    description: "Minor inconvenience with an obvious workaround. Can wait days.",
  },
  {
    label: "P3 Medium",
    description: "Real customer impact and a workaround exists. Handle this week.",
  },
  {
    label: "P4 High",
    description: "Significant revenue, access, or security risk within a day.",
  },
  {
    label: "P5 Critical",
    description: "Outage, data exposure, or imminent loss of service.",
  },
];

export const URGENT_INSTRUCTIONS =
  "Does this message need a human response within the next hour to prevent customer harm, data exposure, revenue loss, or an outage?";

export const ROUTE_INSTRUCTIONS =
  "Route this message to exactly one queue: billing, bug, sales, or spam.";

export const PRIORITY_INSTRUCTIONS =
  "Score how quickly a human should act. Levels are ordered from P1 Trivial (lowest) to P5 Critical (highest).";

export const TRIAGE_QUESTIONS = {
  urgent: {
    name: "urgent",
    type: "predicate",
    instructions: URGENT_INSTRUCTIONS,
  },
  route: {
    name: "route",
    type: "choice",
    instructions: ROUTE_INSTRUCTIONS,
    choices: ROUTE_CHOICES,
  },
  priority: {
    name: "priority",
    type: "score",
    instructions: PRIORITY_INSTRUCTIONS,
    levels: PRIORITY_LEVELS,
  },
} as const;

export function levelLabelForScore(score: number): string {
  const index = Math.min(PRIORITY_LEVELS.length - 1, Math.max(0, Math.round(score) - 1));
  return PRIORITY_LEVELS[index]?.label ?? "P1 Trivial";
}

export function levelLabelForIndex(index: number): string {
  const clamped = Math.min(PRIORITY_LEVELS.length - 1, Math.max(0, Math.round(index)));
  return PRIORITY_LEVELS[clamped]?.label ?? "P1 Trivial";
}
