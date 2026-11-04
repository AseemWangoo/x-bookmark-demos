import { describe, expect, test } from "bun:test";

import docsExample from "../fixtures/docs-example.json";
import { normalizeAnswers } from "../server/normalize";
import { sarvamResponseSchema } from "../server/schema";

describe("normalize", () => {
  test("the verbatim docs example parses and maps by question id", () => {
    const parsed = sarvamResponseSchema.parse(docsExample);
    const byId = normalizeAnswers(parsed.answers);
    const department = byId.department;
    const severity = byId.severity;
    const urgent = byId.urgent;
    expect(department?.kind).toBe("choice");
    expect(severity?.kind).toBe("score");
    expect(urgent?.kind).toBe("noul");
    if (department?.kind !== "choice" || severity?.kind !== "score" || urgent?.kind !== "noul") {
      throw new Error("docs example did not normalize to the expected kinds");
    }
    expect(department.pTop).toBe(department.probabilities[department.choice]);
    expect(department.choice).toBe("billing");
    expect(department.pTop).toBe(0.8044);
    expect(severity.label).toBe(severity.legend[String(Math.round(severity.score))]);
    expect(severity.label).toBe("critical");
    expect(urgent.pYes).toBe(0.9782);
    expect(byId.team).toBeUndefined();
  });

  test("unknown answer types are surfaced", () => {
    const byId = normalizeAnswers({
      weird: { type: "yes_no", yes: 0.4 },
      team: { type: "choice", choice: "sales", confidence: 0.5, probabilities: { sales: 0.8, payments: 0.2 } },
    });
    const weird = byId.weird;
    expect(weird?.kind).toBe("unknown");
    if (weird?.kind !== "unknown") throw new Error("expected unknown");
    expect(weird.type).toBe("yes_no");
    expect(byId.team?.kind).toBe("choice");
  });
});
