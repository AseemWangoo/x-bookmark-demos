export type DeskSource = "live" | "mock";

export type TableGrid = {
  index: number;
  caption: string | null;
  headers: string[];
  headerNote: string | null;
  rows: string[][];
  footer: string[][];
};

export type TokenUsage = {
  promptTokens: number;
  evalTokens: number;
};

export type TranscribeRequest = {
  imageBase64: string;
  mimeType: string;
};

export type TranscribeResult = {
  markdown: string;
  tables: TableGrid[];
  wallMs: number;
  doneReason: string | null;
  source: DeskSource;
  model: string;
  usage?: TokenUsage;
  warning: string | null;
  label: string;
};

export type ModePayload = {
  mode: DeskSource;
  banner: string;
  detail: string;
  model: string;
  host: string | null;
  loopback: boolean;
  mockForced: boolean;
  commands: string[];
  ramNote: string;
  license: string;
  setup: string[];
};
