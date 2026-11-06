export const ASYNC_TOOL_NAMES = [
  "start_async_task",
  "check_async_task",
  "update_async_task",
  "cancel_async_task",
  "list_async_tasks",
] as const;

export type AsyncToolName = (typeof ASYNC_TOOL_NAMES)[number];

export const TASK_STATUSES = [
  "pending",
  "running",
  "waiting",
  "success",
  "error",
  "cancelled",
  "timeout",
  "interrupted",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type AgentName = "researcher" | "coder";

export const SIMULATED_BANNER = "Simulated run — no model calls";

export const MOCK_TIMING = {
  pendingMs: 400,
  researcherMs: 16_000,
  coderMs: 180_000,
  followUpMs: 8_000,
} as const;

export const PRESETS = [
  {
    id: "research",
    label: "Research brief",
    message: "Write a competitive research brief on async agent runtimes.",
  },
  {
    id: "code",
    label: "Code task",
    message:
      "Write a small TypeScript function that retries a flaky fetch with backoff.",
  },
  {
    id: "both",
    label: "Research and code",
    message:
      "Research async subagents and sketch a tiny supervisor loop. I'll keep chatting while you work.",
  },
] as const;

export type TaskView = {
  taskId: string;
  agentName: AgentName;
  threadId: string;
  runId: string;
  status: TaskStatus;
  description: string;
  createdAt: string;
  updatedAt?: string;
  checkedAt?: string;
  result?: string;
  simulated: boolean;
  lastAction?: AsyncToolName;
};

export type DeskMode = "mock" | "live";

export function isAsyncToolName(value: string): value is AsyncToolName {
  return (ASYNC_TOOL_NAMES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: TaskStatus): boolean {
  switch (status) {
    case "success":
    case "error":
    case "cancelled":
    case "timeout":
    case "interrupted":
      return true;
    case "pending":
    case "running":
    case "waiting":
      return false;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "waiting":
      return "Waiting";
    case "success":
      return "Success";
    case "error":
      return "Error";
    case "cancelled":
      return "Cancelled";
    case "timeout":
      return "Timeout";
    case "interrupted":
      return "Interrupted";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function elapsedMs(
  task: Pick<TaskView, "createdAt" | "updatedAt" | "status">,
  now: number,
): number {
  const start = Date.parse(task.createdAt);
  if (Number.isNaN(start)) return 0;
  const end =
    isTerminalStatus(task.status) && task.updatedAt
      ? Date.parse(task.updatedAt)
      : now;
  return Math.max(0, end - start);
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
