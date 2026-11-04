import { PRESETS } from "./presets";
import { normalizeText } from "../src/lib/text";
import {
  LANGS,
  TEAMS,
  type Lang,
  type TeamId,
} from "../src/lib/types";

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
};

export type NoulAnswer = {
  type: "noul";
  noul: number;
};

export type MockResponse = {
  model: "sarvam-prism";
  synthetic: true;
  answers: {
    team: ChoiceAnswer;
    urgency: ScoreAnswer;
    escalate: NoulAnswer;
  };
  usage: { input_tokens: number; output_tokens: 0 };
};

const URGENCY_LEGEND: Record<string, string> = {
  "0": "low",
  "1": "normal",
  "2": "high",
  "3": "critical",
};

type Weights = Record<TeamId, number>;

type Spec = {
  team: Weights;
  urgency: [number, number, number, number];
  escalate: number;
  soften: Record<Lang, number>;
};

const SOFTEN: Record<Lang, number> = {
  en: 0,
  hinglish: 0.03,
  hi: 0.08,
  ta: 0.1,
  bn: 0.11,
  te: 0.09,
  mr: 0.07,
};

const SPECS: Record<string, Spec> = {
  upi: {
    team: {
      payments: 0.96,
      technical: 0.01,
      account_kyc: 0.01,
      orders_delivery: 0.015,
      sales: 0.005,
    },
    urgency: [0.02, 0.06, 0.74, 0.18],
    escalate: 0.94,
    soften: SOFTEN,
  },
  crash: {
    team: {
      payments: 0.02,
      technical: 0.93,
      account_kyc: 0.03,
      orders_delivery: 0.01,
      sales: 0.01,
    },
    urgency: [0.03, 0.1, 0.7, 0.17],
    escalate: 0.71,
    soften: SOFTEN,
  },
  kyc: {
    team: {
      payments: 0.02,
      technical: 0.03,
      account_kyc: 0.91,
      orders_delivery: 0.02,
      sales: 0.02,
    },
    urgency: [0.06, 0.72, 0.18, 0.04],
    escalate: 0.22,
    soften: SOFTEN,
  },
  delivery: {
    team: {
      payments: 0.02,
      technical: 0.02,
      account_kyc: 0.03,
      orders_delivery: 0.91,
      sales: 0.02,
    },
    urgency: [0.05, 0.68, 0.22, 0.05],
    escalate: 0.11,
    soften: SOFTEN,
  },
  takeover: {
    team: {
      payments: 0.03,
      technical: 0.33,
      account_kyc: 0.58,
      orders_delivery: 0.03,
      sales: 0.03,
    },
    urgency: [0.01, 0.02, 0.08, 0.89],
    escalate: 0.97,
    soften: {
      en: 0,
      hinglish: 0.04,
      hi: 0.06,
      ta: 0.08,
      bn: 0.07,
      te: 0.08,
      mr: 0.06,
    },
  },
  seats: {
    team: {
      payments: 0.02,
      technical: 0.02,
      account_kyc: 0.03,
      orders_delivery: 0.02,
      sales: 0.91,
    },
    urgency: [0.78, 0.16, 0.04, 0.02],
    escalate: 0.06,
    soften: SOFTEN,
  },
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function choiceConfidence(pTop: number, n: number): number {
  if (n <= 1) return 1;
  return (pTop - 1 / n) / (1 - 1 / n);
}

export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  const sum = keys.reduce((total, key) => total + (weights[key] ?? 0), 0);
  const out: Record<string, number> = {};
  let acc = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i] ?? "";
    const value = round4((weights[key] ?? 0) / sum);
    out[key] = value;
    acc += value;
  }
  const last = keys[keys.length - 1] ?? "";
  out[last] = round4(1 - acc);
  return out;
}

function softenTop(base: Weights, drop: number): Weights {
  const top = TEAMS.reduce((best, team) => (base[team] > base[best] ? team : best), TEAMS[0]);
  const next: Weights = { ...base };
  next[top] = Math.max(0.01, base[top] - drop);
  const others = TEAMS.filter((team) => team !== top);
  const share = drop / others.length;
  for (const team of others) next[team] += share;
  return next;
}

function choiceFrom(weights: Record<string, number>): ChoiceAnswer {
  const probabilities = normalizeWeights(weights);
  const choice = Object.entries(probabilities).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best,
  )[0];
  const pTop = probabilities[choice] ?? 0;
  return {
    type: "choice",
    choice,
    confidence: choiceConfidence(pTop, Object.keys(probabilities).length),
    probabilities,
  };
}

function scoreFrom(levels: [number, number, number, number]): ScoreAnswer {
  const probabilities = normalizeWeights({
    "0": levels[0],
    "1": levels[1],
    "2": levels[2],
    "3": levels[3],
  });
  const score = round4(
    Object.entries(probabilities).reduce(
      (total, [index, probability]) => total + Number(index) * probability,
      0,
    ),
  );
  const pTop = Math.max(...Object.values(probabilities));
  return {
    type: "score",
    score,
    confidence: choiceConfidence(pTop, 4),
    legend: { ...URGENCY_LEGEND },
    probabilities,
  };
}

export function buildFixture(presetId: string, lang: Lang, text: string): MockResponse {
  const spec = SPECS[presetId];
  if (!spec) throw new Error(`No mock spec for preset ${presetId}`);
  const team = choiceFrom(softenTop(spec.team, spec.soften[lang]));
  return {
    model: "sarvam-prism",
    synthetic: true,
    answers: {
      team,
      urgency: scoreFrom(spec.urgency),
      escalate: { type: "noul", noul: spec.escalate },
    },
    usage: {
      input_tokens: Math.max(48, Math.round(normalizeText(text).length / 3) + 80),
      output_tokens: 0,
    },
  };
}

export function allMockResponses(): { presetId: string; lang: Lang; text: string; response: MockResponse }[] {
  const rows = [];
  for (const preset of PRESETS) {
    for (const lang of LANGS) {
      const text = preset.variants[lang];
      rows.push({
        presetId: preset.id,
        lang,
        text,
        response: buildFixture(preset.id, lang, text),
      });
    }
  }
  return rows;
}
