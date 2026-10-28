export interface VendorInput {
  name: string;
  email: string;
  category: string;
  terms: string;
}

export interface CallResult {
  integration: string;
  arguments: { input: unknown; idempotency_key?: string };
  trail: string[];
  output: unknown;
  error?: string;
  possibleCommit: boolean;
  ms: number;
  cold: boolean;
  coldMs: number | null;
  warmMs: number | null;
  latencyLabel: "measured" | "recorded";
  synthetic: boolean;
  recordedAt: string | null;
}

export interface ModeReport {
  mode: "local" | "replay";
  reason: string;
  pomeradoVersion: string | null;
  node: string | null;
  chromium: boolean;
  minted: boolean;
  synthetic: boolean;
  recordedAt: string | null;
  portalUrl: string | null;
  secondsPerStep: number;
}

export type AskResponse =
  | { kind: "help"; message: string; secondsPerStep: number }
  | { kind: "needs-confirm"; integration: "add_vendor"; input: VendorInput; secondsPerStep: number }
  | {
      kind: "call";
      integration: "list_invoices" | "list_vendors";
      input: Record<string, unknown>;
      result: CallResult;
      secondsPerStep: number;
    };
