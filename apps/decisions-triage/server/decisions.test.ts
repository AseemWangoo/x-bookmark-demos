import { expect, test } from "bun:test";
import { INBOX } from "../fixtures/messages.ts";
import { buildDecisionRequest, callDecisions, normalizeDecision } from "./decisions.ts";
import type { DecisionPayload } from "./schema.ts";

const sample: DecisionPayload = {
  model: "gpt-6-luna",
  usage: {
    input_tokens: 10,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: 1,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 11,
  },
  answers: [],
};

test("per-message body has the three documented questions", () => {
  const message = INBOX[0];
  if (!message) throw new Error("missing fixture");
  const body = buildDecisionRequest(message, "per_message");
  expect(body.model).toBe("gpt-6-luna");
  expect(body.input).toContain("id: m1");
  expect(body.questions).toHaveLength(3);
  expect(body.questions[0]).toEqual({
    type: "predicate",
    name: "urgent",
    instructions: expect.any(String),
  });
  expect(body.questions[1]).toMatchObject({
    type: "choice",
    name: "route",
  });
  expect("choices" in body.questions[1] && body.questions[1].choices).toHaveLength(4);
  expect(body.questions[2]).toMatchObject({
    type: "score",
    name: "priority",
  });
  expect("levels" in body.questions[2] && body.questions[2].levels).toHaveLength(5);
  expect(body.questions[0]).not.toHaveProperty("choices");
  expect(body.questions[0]).not.toHaveProperty("levels");
});

test("packed body has 3N unique names and throws above 400", () => {
  const body = buildDecisionRequest(INBOX, "packed");
  expect(body.questions).toHaveLength(30);
  const names = body.questions.map((question) => ("name" in question ? question.name : ""));
  expect(new Set(names).size).toBe(30);
  const route = body.questions.find((question) => question.name === "m3.route");
  expect(route?.instructions.startsWith("For the message with id m3:")).toBe(true);
  const first = INBOX[0];
  if (!first) throw new Error("missing fixture");
  const tooMany = Array.from({ length: 134 }, (_, index) => ({ ...first, id: `x${index}` }));
  expect(() => buildDecisionRequest(tooMany, "packed")).toThrow(/400/);
  const allowed = Array.from({ length: 133 }, (_, index) => ({ ...first, id: `x${index}` }));
  expect(buildDecisionRequest(allowed, "packed").questions).toHaveLength(399);
});

test("normalizeDecision maps by name, including refusal, unknown types, score shift, and packed ids", () => {
  const rows = normalizeDecision(
    {
      answers: [
        { type: "predicate", name: "m3.urgent", probability: 0.25 },
        {
          type: "choice",
          name: "m3.route",
          choice: "bug",
          confidence: 0.4,
          probabilities: [
            { value: "billing", probability: 0.1 },
            { value: "bug", probability: 0.7 },
            { value: "sales", probability: 0.1 },
            { value: "spam", probability: 0.1 },
          ],
        },
        {
          type: "score",
          name: "m3.priority",
          score: 2.5,
          confidence: 0.3,
          probabilities: [
            { value: 0, label: "P1 Trivial", probability: 0.1 },
            { value: 1, label: "P2 Low", probability: 0.1 },
            { value: 2, label: "P3 Medium", probability: 0.2 },
            { value: 3, label: "P4 High", probability: 0.2 },
            { value: 4, label: "P5 Critical", probability: 0.4 },
          ],
        },
        { type: "refusal", name: "m4.route" },
        { type: "nope", name: "m4.urgent" },
      ],
    },
    "packed",
  );
  const m3 = rows.find((row) => row.id === "m3");
  const m4 = rows.find((row) => row.id === "m4");
  expect(m3?.answers.urgent).toMatchObject({ probability: 0.25, value: false, refused: false });
  expect(m3?.answers.route.choice).toBe("bug");
  expect(m3?.answers.priority.score).toBe(3.5);
  expect(m3?.answers.priority.level).toBe("P4 High");
  expect(m4?.answers.route.refused).toBe(true);
  expect(m4?.answers.urgent.unrecognised).toBe(true);
  expect(rows.map((row) => row.id)).not.toContain("0");
});

test("callDecisions uses decisions.create and falls back to post", async () => {
  let created = 0;
  let posted = 0;
  const withCreate = {
    decisions: {
      create: () => {
        created += 1;
        const pending = Promise.resolve(sample);
        return Object.assign(pending, {
          withResponse: async () => ({
            data: sample,
            response: new Response(null, { headers: { "openai-processing-ms": "9" } }),
          }),
        });
      },
    },
  };
  const viaSdk = await callDecisions(withCreate, {
    model: "gpt-6-luna",
    input: "hello",
    questions: [{ type: "predicate", name: "urgent", instructions: "now?" }],
  });
  expect(created).toBe(1);
  expect(viaSdk.raw.model).toBe("gpt-6-luna");
  expect(viaSdk.latencyMs).toBeGreaterThanOrEqual(0);

  const withPost = {
    post: (path: string) => {
      posted += 1;
      expect(path).toBe("/decisions");
      return Promise.resolve(sample);
    },
  };
  const viaPost = await callDecisions(withPost, {
    model: "gpt-6-luna",
    input: "hello",
    questions: [{ type: "predicate", name: "urgent", instructions: "now?" }],
  });
  expect(posted).toBe(1);
  expect(viaPost.raw).toEqual(sample);
});
