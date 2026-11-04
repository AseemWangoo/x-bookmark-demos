import { describe, expect, test } from "bun:test";

import { allMockResponses, choiceConfidence } from "../fixtures/mock-responses";
import { PRESETS } from "../fixtures/presets";
import { LANGS } from "../src/lib/types";
import { textHash } from "../server/latency";
import {
  choiceAnswerSchema,
  noulAnswerSchema,
  sarvamResponseSchema,
  scoreAnswerSchema,
} from "../server/schema";

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe("fixtures", () => {
  const rows = allMockResponses();

  test("every preset has all 7 variants and unique hashes", () => {
    expect(PRESETS).toHaveLength(6);
    const hashes = new Set<string>();
    for (const preset of PRESETS) {
      expect(Object.keys(preset.variants).sort()).toEqual([...LANGS].sort());
      for (const lang of LANGS) {
        expect(preset.variants[lang].replace(/\s/g, "").length).toBeGreaterThanOrEqual(6);
        hashes.add(textHash(preset.variants[lang]));
      }
    }
    expect(hashes.size).toBe(PRESETS.length * LANGS.length);
  });

  test("every mock response matches the documented shape and is synthetic", () => {
    expect(rows).toHaveLength(42);
    for (const row of rows) {
      const parsed = sarvamResponseSchema.parse(row.response);
      expect(parsed.synthetic).toBe(true);
      expect(parsed.usage.output_tokens).toBe(0);
      expect(choiceAnswerSchema.parse(row.response.answers.team).type).toBe("choice");
      expect(scoreAnswerSchema.parse(row.response.answers.urgency).type).toBe("score");
      expect(noulAnswerSchema.parse(row.response.answers.escalate).type).toBe("noul");

      const team = row.response.answers.team;
      const teamSum = sum(Object.values(team.probabilities));
      expect(Math.abs(teamSum - 1)).toBeLessThanOrEqual(1e-3);
      const argmax = Object.entries(team.probabilities).reduce((best, entry) =>
        entry[1] > best[1] ? entry : best,
      );
      expect(team.choice).toBe(argmax[0]);
      const expected = choiceConfidence(team.probabilities[team.choice] ?? 0, Object.keys(team.probabilities).length);
      expect(Math.abs(team.confidence - expected)).toBeLessThanOrEqual(0.01);

      const urgency = row.response.answers.urgency;
      expect(Math.abs(sum(Object.values(urgency.probabilities)) - 1)).toBeLessThanOrEqual(1e-3);
    }
  });

  test("preset 5 stays under 0.9 in every language", () => {
    const takeover = rows.filter((row) => row.presetId === "takeover");
    expect(takeover).toHaveLength(7);
    for (const row of takeover) {
      const team = row.response.answers.team;
      const pTop = team.probabilities[team.choice] ?? 1;
      expect(pTop).toBeLessThan(0.9);
      expect(row.response.answers.urgency.legend[String(Math.round(row.response.answers.urgency.score))]).toBe(
        "critical",
      );
      expect(row.response.answers.escalate.noul).toBeGreaterThan(0.5);
    }
  });
});
