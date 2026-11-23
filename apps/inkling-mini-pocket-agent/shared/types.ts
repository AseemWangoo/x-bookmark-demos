export const TOOL_NAMES = ["list_files", "read_file", "tag_file", "write_summary"] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type TraceName = ToolName | "rejected";

export type RootId = "fixture" | "custom";

export type FileKind = "note" | "receipt" | "summary" | "other";

export type PocketFile = {
  path: string;
  name: string;
  kind: FileKind;
  mime: string;
  size: number;
  tags: string[];
};

export type TraceEntry = {
  id: string;
  name: TraceName;
  args: Record<string, unknown>;
  resultExcerpt: string;
  durationMs: number;
  highlightPath: string | null;
};

export type Usage = {
  inputTokens: number;
  outputTokens: number;
};

export type RunSource = "live" | "mock";

export type DeskMode = "mock" | "live" | "hosted-blocked";

export type AgentResult = {
  trace: TraceEntry[];
  files: PocketFile[];
  summaryPath: string | null;
  summaryMarkdown: string | null;
  ttftMs: number | null;
  tokensPerSec: number | null;
  tokensPerSecLabel: string;
  usage: Usage | null;
  turns: number;
  wallMs: number | null;
  source: RunSource;
  endpointHost: string | null;
  offline: boolean;
  model: string;
  message: string | null;
  recorded: boolean;
};

export type AgentEvent =
  | { type: "trace"; entry: TraceEntry }
  | { type: "files"; files: PocketFile[] }
  | { type: "summary"; path: string; markdown: string }
  | { type: "result"; result: AgentResult }
  | { type: "error"; message: string };

export type ModeReport = {
  mode: DeskMode;
  model: string;
  endpointHost: string | null;
  loopback: boolean;
  offline: boolean;
  mock: boolean;
  recordedLabel: string | null;
  reasoningEffort: string;
  message: string;
  pocketFolder: string | null;
};

export type RunRequest = {
  rootId: RootId;
  customPath?: string;
};

export type FilePreview = {
  path: string;
  kind: FileKind;
  mime: string;
  tags: string[];
  text: string | null;
  dataUrl: string | null;
};
