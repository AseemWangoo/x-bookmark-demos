import type { ExpectedLabels, NormalizedAnswers } from "./types.ts";

export type FieldAgreement = {
  urgent: boolean;
  route: boolean;
  priority: boolean;
  matched: number;
  total: 3;
};

export function agreement(expected: ExpectedLabels, answers: NormalizedAnswers): FieldAgreement {
  const urgent =
    !answers.urgent.refused &&
    !answers.urgent.unrecognised &&
    answers.urgent.value !== null &&
    answers.urgent.value === expected.urgent;
  const route =
    !answers.route.refused &&
    !answers.route.unrecognised &&
    answers.route.choice === expected.route;
  const rounded =
    answers.priority.score === null ? null : Math.round(answers.priority.score);
  const priority =
    !answers.priority.refused &&
    !answers.priority.unrecognised &&
    rounded === expected.priority;
  return {
    urgent,
    route,
    priority,
    matched: Number(urgent) + Number(route) + Number(priority),
    total: 3,
  };
}

export function answersAgree(left: NormalizedAnswers, right: NormalizedAnswers): boolean {
  if (left.urgent.refused || right.urgent.refused || left.urgent.unrecognised || right.urgent.unrecognised) {
    return false;
  }
  if (left.urgent.value === null || right.urgent.value === null || left.urgent.value !== right.urgent.value) {
    return false;
  }
  if (left.route.refused || right.route.refused || left.route.unrecognised || right.route.unrecognised) {
    return false;
  }
  if (left.route.choice === null || left.route.choice !== right.route.choice) return false;
  if (left.priority.refused || right.priority.refused || left.priority.unrecognised || right.priority.unrecognised) {
    return false;
  }
  if (left.priority.score === null || right.priority.score === null) return false;
  return Math.round(left.priority.score) === Math.round(right.priority.score);
}
