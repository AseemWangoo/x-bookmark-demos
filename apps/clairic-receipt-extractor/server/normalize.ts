import type {
  Answer,
  FieldSpec,
  FieldType,
  ListAnswer,
  NumericAnswer,
  TemporalAnswer,
  TextAnswer,
} from "../src/lib/types.ts";

export function parseAnswer(raw: unknown): Answer {
  if (!raw || typeof raw !== "object") {
    throw new Error("Clairic answer was not an object");
  }
  const row = raw as Record<string, unknown>;
  const type = row.type;
  if (!isFieldType(type)) {
    throw new Error("Clairic answer had an unknown type");
  }
  switch (type) {
    case "text":
      return parseText(row);
    case "number":
    case "duration":
      return parseNumeric(type, row);
    case "date":
    case "time":
    case "datetime":
      return parseTemporal(type, row);
    case "list":
      return parseList(row);
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled answer type ${exhaustive}`);
    }
  }
}

export function answerFromLlmValue(field: FieldSpec, value: unknown): Answer {
  const normalized = value === undefined ? null : value;
  switch (field.type) {
    case "text":
      return {
        type: "text",
        value: expectStringOrNull(field.name, normalized),
        guess: null,
        confidence: null,
        p_null: null,
        span: null,
      };
    case "number":
    case "duration":
      return {
        type: field.type,
        value: expectNumberOrNull(field.name, normalized),
        guess: null,
        confidence: null,
        p_null: null,
        unit: field.unit,
      };
    case "date":
    case "time":
    case "datetime":
      return {
        type: field.type,
        value: expectStringOrNull(field.name, normalized),
        guess: null,
        confidence: null,
        p_null: null,
      };
    case "list":
      return {
        type: "list",
        value: expectList(field.name, normalized),
        spans: null,
        confidence: null,
        p_null: null,
      };
    default: {
      const exhaustive: never = field.type;
      throw new Error(`Unhandled field type ${exhaustive}`);
    }
  }
}

function parseText(row: Record<string, unknown>): TextAnswer {
  return {
    type: "text",
    value: row.value === null || row.value === undefined ? null : String(row.value),
    guess: row.guess === null || row.guess === undefined ? null : String(row.guess),
    confidence: numberOrNull(row.confidence),
    p_null: numberOrNull(row.p_null),
    span: pairOrNull(row.span),
  };
}

function parseNumeric(type: "number" | "duration", row: Record<string, unknown>): NumericAnswer {
  return {
    type,
    value: row.value === null || row.value === undefined ? null : expectNumberOrNull(type, row.value),
    guess: row.guess === null || row.guess === undefined ? null : expectNumberOrNull(type, row.guess),
    confidence: numberOrNull(row.confidence),
    p_null: numberOrNull(row.p_null),
    unit: typeof row.unit === "string" ? row.unit : undefined,
  };
}

function parseTemporal(
  type: "date" | "time" | "datetime",
  row: Record<string, unknown>,
): TemporalAnswer {
  return {
    type,
    value: row.value === null || row.value === undefined ? null : String(row.value),
    guess: row.guess === null || row.guess === undefined ? null : String(row.guess),
    confidence: numberOrNull(row.confidence),
    p_null: numberOrNull(row.p_null),
  };
}

function parseList(row: Record<string, unknown>): ListAnswer {
  return {
    type: "list",
    value: Array.isArray(row.value)
      ? row.value.map((item) => (typeof item === "number" ? item : String(item)))
      : [],
    spans: Array.isArray(row.spans)
      ? row.spans.map((pair) => {
          const span = pairOrNull(pair);
          if (!span) throw new Error("List span was not a pair");
          return span;
        })
      : null,
    confidence: numberOrNull(row.confidence),
    p_null: numberOrNull(row.p_null),
  };
}

function isFieldType(value: unknown): value is FieldType {
  return (
    value === "text" ||
    value === "number" ||
    value === "date" ||
    value === "time" ||
    value === "datetime" ||
    value === "duration" ||
    value === "list"
  );
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pairOrNull(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const start = value[0];
  const end = value[1];
  if (typeof start !== "number" || typeof end !== "number") return null;
  return [start, end];
}

function expectStringOrNull(name: string, value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new Error(`${name} was not text`);
}

function expectNumberOrNull(name: string, value: unknown): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  throw new Error(`${name} was not a number`);
}

function expectList(name: string, value: unknown): Array<string | number> {
  if (!Array.isArray(value)) throw new Error(`${name} was not a list`);
  return value.map((item) => {
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item === "string") return item;
    throw new Error(`${name} list item was not text or a number`);
  });
}
