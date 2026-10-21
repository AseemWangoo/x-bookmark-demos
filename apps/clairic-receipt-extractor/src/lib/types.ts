export const FIELD_TYPES = [
  "text",
  "number",
  "date",
  "time",
  "datetime",
  "duration",
  "list",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export type ListItemType = "text" | "number" | "date";

export type FieldSpec = {
  name: string;
  type: FieldType;
  instructions?: string;
  decimals?: number;
  unit?: string;
  integer?: boolean;
  items?: ListItemType;
};

export type TextAnswer = {
  type: "text";
  value: string | null;
  guess: string | null;
  confidence: number | null;
  p_null: number | null;
  span: [number, number] | null;
};

export type NumericAnswer = {
  type: "number" | "duration";
  value: number | null;
  guess: number | null;
  confidence: number | null;
  p_null: number | null;
  unit?: string;
};

export type TemporalAnswer = {
  type: "date" | "time" | "datetime";
  value: string | null;
  guess: string | null;
  confidence: number | null;
  p_null: number | null;
};

export type ListAnswer = {
  type: "list";
  value: Array<string | number>;
  spans: Array<[number, number]> | null;
  confidence: number | null;
  p_null: number | null;
};

export type Answer = TextAnswer | NumericAnswer | TemporalAnswer | ListAnswer;

export type Unrecorded = {
  recorded: false;
  message: "not recorded: switch to live mode";
};

export const UNRECORDED: Unrecorded = {
  recorded: false,
  message: "not recorded: switch to live mode",
};

export type FieldResult = Answer | Unrecorded;

export type ClairicUsage = {
  state_tokens: number;
  image_tokens: number;
  schema_tokens: number;
  input_tokens: number;
  output_tokens: number;
  passes: number;
};

export type LlmUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type TokenUsage = ClairicUsage | LlmUsage;

export type ModelRun = {
  model: string;
  answers: Record<string, FieldResult>;
  usage: TokenUsage | null;
  latencyMs: number;
  costUsd: number | null;
  synthetic?: boolean;
  truncated?: boolean;
};

export type ExtractResponse = {
  mode: "sample" | "live";
  clairic: ModelRun;
  llm?: ModelRun;
  errors?: string[];
};

export type FixtureKind = "receipt" | "invoice" | "email" | "bank";

export type Fixture = {
  id: string;
  kind: FixtureKind;
  title: string;
  blurb: string;
  source: string;
  presetFields: FieldSpec[];
};

export type ExtractRequest = {
  source: string;
  fields: FieldSpec[];
  compare: boolean;
  fixtureId?: string;
  forceSample?: boolean;
};

export function isUnrecorded(value: FieldResult): value is Unrecorded {
  return "recorded" in value && value.recorded === false;
}

export function isAnswer(value: FieldResult): value is Answer {
  return !isUnrecorded(value);
}
