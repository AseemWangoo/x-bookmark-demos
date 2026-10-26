export type RunMode = "mock" | "live";

export type ModelChoice = "pro" | "highspeed";

export type Effort = "low" | "high" | "max";

export type TurnKind = "generate" | "edit" | "fix";

export type ErrorPhase = "compile" | "build" | "frame" | "timeout" | "blocked";

export type TurnStatus = "ok" | "runtime error" | "fixed";

export type NormalizedUsage = {
  prompt: number;
  cached: number;
  cacheWrite: number;
  uncached: number;
  completion: number;
  reasoning: number;
  total: number;
};

export type Timings = {
  ttftMs: number;
  firstContentMs: number;
  totalMs: number;
};

export type SceneError = {
  phase: ErrorPhase;
  message: string;
  line?: number;
  stack?: string;
};

export type TurnRequest = {
  kind: TurnKind;
  prompt: string;
  currentCode?: string;
  error?: {
    phase: ErrorPhase;
    message: string;
    line?: number;
  };
  model: ModelChoice;
  effort: Effort;
  forceMock?: boolean;
};

export type StartEvent = {
  type: "start";
  model: ModelChoice;
  modelId: string;
  effort: Effort;
  synthetic: boolean;
};

export type ReasoningEvent = {
  type: "reasoning";
  text: string;
};

export type ContentEvent = {
  type: "content";
  text: string;
};

export type DoneEvent = {
  type: "done";
  code: string;
  usage: NormalizedUsage;
  timings: Timings;
  costUsd: number;
  finishReason: string | null;
  synthetic: boolean;
};

export type ErrorEvent = {
  type: "error";
  status?: number;
  errorType?: string;
  message: string;
};

export type TurnEvent = StartEvent | ReasoningEvent | ContentEvent | DoneEvent | ErrorEvent;

export type ExampleScene = {
  id: string;
  prompt: string;
  edits: string[];
};

export type TurnRecord = {
  id: string;
  kind: TurnKind;
  prompt: string;
  model: ModelChoice;
  modelId: string;
  effort: Effort;
  code: string;
  baseCode: string;
  reasoning: string;
  usage: NormalizedUsage;
  timings: Timings;
  costUsd: number;
  status: TurnStatus;
  synthetic: boolean;
  sceneId: string | null;
};
