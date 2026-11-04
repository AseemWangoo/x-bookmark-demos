import { describe, expect, test } from "bun:test";

import { scoreMessage } from "../server/mock-scorer";
import { choiceAnswerSchema, sarvamResponseSchema } from "../server/schema";

describe("mock scorer", () => {
  test("is deterministic and shaped like a Prism response", () => {
    const first = scoreMessage("paisa kat gaya");
    const second = scoreMessage("paisa kat gaya");
    expect(first).toEqual(second);
    const parsed = sarvamResponseSchema.parse(first);
    expect(parsed.synthetic).toBe(true);
    expect(parsed.usage.output_tokens).toBe(0);
    const team = choiceAnswerSchema.parse(first.answers.team);
    expect(team.choice).toBe("payments");
  });

  test("reads Devanagari payment keywords", () => {
    const scored = scoreMessage("मेरा पैसा कट गया और भुगतान फेल हो गया");
    expect(scored.answers.team.choice).toBe("payments");
  });
});
