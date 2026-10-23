import { expect, test } from "bun:test";
import { MOCK_DECISIONS, MOCK_PACKED_DECISION } from "../fixtures/mock-decisions.ts";
import { MOCK_RESPONSES } from "../fixtures/mock-responses.ts";
import { ROUTE_VALUES } from "../src/lib/types.ts";
import { decisionResponseSchema, responseComparisonSchema } from "./schema.ts";

function expectProbabilities(sum: number) {
  expect(Math.abs(sum - 1)).toBeLessThan(0.02);
}

test("illustrative decision mocks match the documented response shape", () => {
  for (const fixture of [...MOCK_DECISIONS, MOCK_PACKED_DECISION]) {
    expect(fixture.synthetic).toBe(true);
    const parsed = decisionResponseSchema.parse(fixture.response);
    for (const answer of parsed.answers) {
      if (answer.type === "predicate") {
        expect(answer.probability).toBeGreaterThanOrEqual(0);
        expect(answer.probability).toBeLessThanOrEqual(1);
      } else if (answer.type === "choice") {
        const values = answer.probabilities.map((item) => item.value);
        for (const value of values) {
          expect(typeof value).toBe("string");
          expect((ROUTE_VALUES as readonly (string | boolean)[]).includes(value)).toBe(true);
        }
        expect(values).toContain(answer.choice);
        expectProbabilities(answer.probabilities.reduce((sum, item) => sum + item.probability, 0));
      } else if (answer.type === "score") {
        expectProbabilities(answer.probabilities.reduce((sum, item) => sum + item.probability, 0));
        const weighted = answer.probabilities.reduce((sum, item) => sum + item.value * item.probability, 0);
        expect(Math.abs(answer.score - weighted)).toBeLessThan(0.02);
      } else if (answer.type === "refusal") {
        expect(answer.name).toContain("priority");
      } else {
        const unexpected: never = answer;
        throw new Error(`unexpected answer ${JSON.stringify(unexpected)}`);
      }
    }
  }
  expect(MOCK_DECISIONS.some((fixture) => fixture.response.answers.some((answer) => answer.type === "refusal"))).toBe(
    true,
  );
  expect(MOCK_PACKED_DECISION.response.answers).toHaveLength(30);
});

test("illustrative response mocks are strict JSON without probabilities", () => {
  for (const fixture of MOCK_RESPONSES) {
    const parsed = responseComparisonSchema.parse(fixture);
    expect(JSON.parse(parsed.output_text)).toEqual(parsed.answer);
    expect(parsed.output_text).not.toContain("probability");
  }
});
