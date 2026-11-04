import { describe, expect, test } from "bun:test";

import { authHeaders, buildRequest, PRISM_AUTH_HEADER } from "../server/prism";

describe("buildRequest", () => {
  const body = buildRequest("hello desk", "sarvam-prism");

  test("body is only model, state, and questions", () => {
    expect(Object.keys(body).sort()).toEqual(["model", "questions", "state"]);
    expect(body.model).toBe("sarvam-prism");
    expect(body.state).toBe("hello desk");
  });

  test("each question has only type, instructions, and criteria", () => {
    for (const question of Object.values(body.questions)) {
      expect(Object.keys(question).sort()).toEqual(["criteria", "instructions", "type"]);
    }
  });

  test("team, urgency, and escalate match the desk contract", () => {
    expect(body.questions.team.type).toBe("choice");
    expect(Object.keys(body.questions.team.criteria)).toEqual([
      "payments",
      "technical",
      "account_kyc",
      "orders_delivery",
      "sales",
    ]);
    expect(body.questions.urgency.type).toBe("score");
    expect(body.questions.urgency.criteria).toEqual(["low", "normal", "high", "critical"]);
    expect(body.questions.escalate.type).toBe("noul");
    expect(Object.keys(body.questions.escalate.criteria).sort()).toEqual(["false", "true"]);
  });

  test("refused generation fields are absent", () => {
    const encoded = JSON.stringify(body);
    expect(encoded).not.toContain("temperature");
    expect(encoded).not.toContain("max_tokens");
    expect(encoded).not.toContain("stream");
    expect(encoded).not.toContain("images");
  });

  test("auth header is api-subscription-key", () => {
    expect(PRISM_AUTH_HEADER).toBe("api-subscription-key");
    const headers = authHeaders("test-key");
    expect(headers["api-subscription-key"]).toBe("test-key");
    expect(headers.Authorization).toBeUndefined();
  });
});
