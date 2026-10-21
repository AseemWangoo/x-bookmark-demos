import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { listFixtures } from "./catalog.ts";

const fixturesDir = join(import.meta.dir, "../fixtures");

test("every recorded span matches the source text", () => {
  const fixtures = listFixtures();
  expect(fixtures).toHaveLength(4);

  for (const fixture of fixtures) {
    const recording = JSON.parse(
      readFileSync(join(fixturesDir, `${fixture.id}.clairic.json`), "utf8"),
    ) as {
      synthetic?: boolean;
      usage: { output_tokens: number };
      answers: Record<string, RawAnswer>;
    };
    expect(recording.synthetic).toBe(true);
    expect(recording.usage.output_tokens).toBe(0);

    for (const field of fixture.presetFields) {
      expect(recording.answers[field.name], `${fixture.id}.${field.name}`).toBeDefined();
      expect(recording.answers[field.name]?.type).toBe(field.type);
    }

    for (const [name, answer] of Object.entries(recording.answers)) {
      assertAnswer(fixture.source, `${fixture.id}.${name}`, answer);
    }
  }
});

test("invoice and email keep the documented spans", () => {
  const invoice = listFixtures().find((fixture) => fixture.id === "invoice-northwind");
  const email = listFixtures().find((fixture) => fixture.id === "email-damaged-order");
  if (!invoice || !email) throw new Error("missing fixture");
  expect(invoice.source.slice(8, 16)).toBe("INV-2291");
  expect(invoice.source.slice(120, 129)).toBe("Dana Ruiz");
  expect(invoice.source.slice(131, 141)).toBe("Priya Shah");
  expect(email.source.slice(10, 17)).toBe("A-88412");
  expect(email.source.slice(50, 64)).toBe("cracked screen");
  expect(email.source.slice(71, 84)).toBe("dented corner");
  expect(email.source.slice(106, 112)).toBe("$52.10");
});

type RawAnswer = {
  type: string;
  value: unknown;
  guess?: unknown;
  span?: [number, number];
  spans?: Array<[number, number]>;
};

function assertAnswer(source: string, label: string, answer: RawAnswer) {
  if (answer.type === "text") {
    expect(answer.span, label).toBeDefined();
    const [start, end] = answer.span ?? [-1, -1];
    const slice = source.slice(start, end);
    if (typeof answer.value === "string") {
      expect(slice, label).toBe(answer.value);
      return;
    }
    expect(answer.value, label).toBeNull();
    if (typeof answer.guess !== "string") throw new Error(`${label} guess`);
    expect(slice, label).toBe(answer.guess);
    return;
  }
  if (answer.type === "list") {
    expect(Array.isArray(answer.value), label).toBe(true);
    const values = answer.value as unknown[];
    expect(answer.spans?.length, label).toBe(values.length);
    values.forEach((item, index) => {
      const range = answer.spans?.[index] ?? [-1, -1];
      if (typeof item !== "string") throw new Error(`${label} item`);
      expect(source.slice(range[0], range[1]), label).toBe(item);
    });
    return;
  }
  expect(answer.span, `${label} should not carry a span`).toBeUndefined();
  expect(answer.spans, `${label} should not carry spans`).toBeUndefined();
}
