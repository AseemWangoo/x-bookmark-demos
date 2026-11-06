import {
  MOCK_TIMING,
  SIMULATED_BANNER,
  type AgentName,
  type AsyncToolName,
  type TaskStatus,
  type TaskView,
} from "../../shared/desk.ts";
import type { Clock } from "../clock.ts";
import { systemClock } from "../clock.ts";
import { DeskError, type ChatEvent, type ChatInput, type DeskBackend } from "./types.ts";

type InternalTask = {
  taskId: string;
  agentName: AgentName;
  threadId: string;
  runId: string;
  status: TaskStatus;
  description: string;
  followUps: string[];
  createdAtMs: number;
  runningAtMs: number;
  successAtMs: number;
  updatedAtMs: number;
  checkedAtMs?: number;
  result?: string;
  lastAction?: AsyncToolName;
};

const RESEARCH_RE =
  /\b(research|brief|competitive|market|analy[sz]e|analysis)\b/i;
const CODE_RE =
  /\b(code|function|typescript|implement|script|retry|sketch)\b/i;
const STATUS_RE =
  /\b(status|progress|how(?:'| i)?s|how is|how are|done yet|finished|result|check on)\b/i;
const LIST_RE = /\b(all tasks|list tasks|both tasks|every task)\b/i;
const CANCEL_RE =
  /^\s*cancel(?:\s+the)?(?:\s+(researcher|coder))?(?:\s+([0-9a-f-]{8,}|task_\S+))?\s*$/i;
const FOLLOW_RE =
  /^\s*(?:follow[- ]?up|update)(?:\s+the)?\s+(researcher|coder)\s*:\s*([\s\S]+)$/i;
const PRODUCT_RE = /^\s*what(?:'s| is)\s+(-?\d+)\s*\*\s*(-?\d+)\s*\??\s*$/i;

export type MockBackendOptions = {
  clock?: Clock;
  tokenDelayMs?: number;
};

export function createMockBackend(options: MockBackendOptions = {}): DeskBackend {
  const clock = options.clock ?? systemClock();
  const tokenDelayMs = options.tokenDelayMs ?? 12;
  const tasks = new Map<string, InternalTask>();
  let threadId: string = crypto.randomUUID();

  function materialize(task: InternalTask, now: number): void {
    if (
      task.status === "cancelled" ||
      task.status === "error" ||
      task.status === "timeout" ||
      task.status === "interrupted" ||
      task.status === "success" ||
      task.status === "waiting"
    ) {
      return;
    }
    if (now >= task.successAtMs) {
      task.status = "success";
      task.updatedAtMs = task.successAtMs;
      task.result = cannedResult(task);
      return;
    }
    if (task.status === "pending" && now >= task.runningAtMs) {
      task.status = "running";
      task.updatedAtMs = task.runningAtMs;
    }
  }

  function view(task: InternalTask): TaskView {
    materialize(task, clock.now());
    const followUp = task.followUps.at(-1);
    return {
      taskId: task.taskId,
      agentName: task.agentName,
      threadId: task.threadId,
      runId: task.runId,
      status: task.status,
      description: followUp
        ? `${task.description}\nFollow-up: ${followUp}`
        : task.description,
      createdAt: new Date(task.createdAtMs).toISOString(),
      updatedAt: new Date(task.updatedAtMs).toISOString(),
      ...(task.checkedAtMs
        ? { checkedAt: new Date(task.checkedAtMs).toISOString() }
        : {}),
      ...(task.result ? { result: task.result } : {}),
      simulated: true,
      ...(task.lastAction ? { lastAction: task.lastAction } : {}),
    };
  }

  function requireTask(taskId: string): InternalTask {
    const task = tasks.get(taskId);
    if (!task) throw new DeskError(404, `No task ${taskId}.`);
    materialize(task, clock.now());
    return task;
  }

  function start(agentName: AgentName, description: string): TaskView {
    const now = clock.now();
    const taskId = crypto.randomUUID();
    const duration =
      agentName === "researcher"
        ? MOCK_TIMING.researcherMs
        : MOCK_TIMING.coderMs;
    const task: InternalTask = {
      taskId,
      agentName,
      threadId: taskId,
      runId: crypto.randomUUID(),
      status: "pending",
      description,
      followUps: [],
      createdAtMs: now,
      runningAtMs: now + MOCK_TIMING.pendingMs,
      successAtMs: now + duration,
      updatedAtMs: now,
      lastAction: "start_async_task",
    };
    tasks.set(taskId, task);
    return view(task);
  }

  function check(taskId: string): TaskView {
    const task = requireTask(taskId);
    task.checkedAtMs = clock.now();
    task.lastAction = "check_async_task";
    return view(task);
  }

  function update(taskId: string, message: string): TaskView {
    const task = requireTask(taskId);
    if (task.status === "cancelled") {
      throw new DeskError(409, `Task ${taskId} is cancelled.`);
    }
    const now = clock.now();
    task.followUps.push(message.trim());
    task.status = "running";
    task.runId = crypto.randomUUID();
    task.runningAtMs = now;
    task.successAtMs = now + MOCK_TIMING.followUpMs;
    task.updatedAtMs = now;
    task.result = undefined;
    task.lastAction = "update_async_task";
    return view(task);
  }

  function cancel(taskId: string): TaskView {
    const task = requireTask(taskId);
    if (
      task.status === "success" ||
      task.status === "error" ||
      task.status === "timeout"
    ) {
      throw new DeskError(409, `Task ${taskId} is already ${task.status}.`);
    }
    task.status = "cancelled";
    task.updatedAtMs = clock.now();
    task.result = undefined;
    task.lastAction = "cancel_async_task";
    return view(task);
  }

  function list(): TaskView[] {
    const views = [...tasks.values()].map((task) => {
      const next = view(task);
      task.lastAction = "list_async_tasks";
      return { ...next, lastAction: "list_async_tasks" as const };
    });
    return views.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async function emitText(
    text: string,
    emit: (event: ChatEvent) => void | Promise<void>,
  ): Promise<void> {
    const chunk = `${text}\n\n${SIMULATED_BANNER}`;
    if (tokenDelayMs <= 0) {
      await emit({ type: "token", text: chunk });
      return;
    }
    const words = chunk.split(/(\s+)/);
    let buffer = "";
    for (const word of words) {
      buffer += word;
      if (buffer.length >= 48) {
        await emit({ type: "token", text: buffer });
        buffer = "";
        await new Promise((resolve) => setTimeout(resolve, tokenDelayMs));
      }
    }
    if (buffer) await emit({ type: "token", text: buffer });
  }

  return {
    mode: "mock",
    simulated: true,
    listTasks: async () => [...tasks.values()].map(view).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    check: async (taskId) => check(taskId),
    update: async (taskId, message) => update(taskId, message),
    cancel: async (taskId) => cancel(taskId),
    async chat(input: ChatInput, emit) {
      const message = input.message.trim();
      if (!message) throw new DeskError(400, "Message is empty.");
      if (input.threadId) threadId = input.threadId;

      const plan = planTurn(message, [...tasks.values()].map(view));
      const lines: string[] = [];
      for (const action of plan) {
        const outcome = runAction(action, { start, check, update, cancel, list });
        await emit({
          type: "tool",
          tool: {
            name: outcome.name,
            args: outcome.args,
            result: outcome.result,
          },
        });
        lines.push(outcome.spoken);
      }
      const prose = lines.length > 0 ? lines.join(" ") : unrelatedReply(message);
      await emitText(prose, emit);
      return { threadId };
    },
  };
}

type Action =
  | { tool: "start_async_task"; agent: AgentName; description: string }
  | { tool: "check_async_task"; taskId: string }
  | { tool: "update_async_task"; taskId: string; message: string }
  | { tool: "cancel_async_task"; taskId: string }
  | { tool: "list_async_tasks" };

function planTurn(message: string, tasks: TaskView[]): Action[] {
  const follow = FOLLOW_RE.exec(message);
  if (follow) {
    const agent = follow[1] === "coder" ? "coder" : "researcher";
    const task = newest(tasks.filter((item) => item.agentName === agent));
    return task
      ? [{ tool: "update_async_task", taskId: task.taskId, message: follow[2] ?? "" }]
      : [];
  }

  const cancel = CANCEL_RE.exec(message);
  if (cancel) {
    const id = cancel[2];
    if (id) {
      const task = tasks.find((item) => item.taskId === id);
      return task ? [{ tool: "cancel_async_task", taskId: task.taskId }] : [];
    }
    const agent = cancel[1] === "coder" || cancel[1] === "researcher" ? cancel[1] : undefined;
    const pool = agent ? tasks.filter((item) => item.agentName === agent) : tasks;
    const active = pool.filter((item) => item.status === "pending" || item.status === "running");
    const target = newest(active.length > 0 ? active : pool);
    return target ? [{ tool: "cancel_async_task", taskId: target.taskId }] : [];
  }

  if (STATUS_RE.test(message) || LIST_RE.test(message)) {
    if (tasks.length === 0) return [];
    if (LIST_RE.test(message) || (mentionsResearch(message) && mentionsCode(message))) {
      return [{ tool: "list_async_tasks" }];
    }
    if (mentionsResearch(message) && !mentionsCode(message)) {
      return checksFor(tasks.filter((item) => item.agentName === "researcher"));
    }
    if (mentionsCode(message) && !mentionsResearch(message)) {
      return checksFor(tasks.filter((item) => item.agentName === "coder"));
    }
    return [{ tool: "list_async_tasks" }];
  }

  const research = mentionsResearch(message);
  const code = mentionsCode(message);
  const actions: Action[] = [];
  if (research) {
    actions.push({
      tool: "start_async_task",
      agent: "researcher",
      description: message,
    });
  }
  if (code) {
    actions.push({
      tool: "start_async_task",
      agent: "coder",
      description: message,
    });
  }
  return actions;
}

function mentionsResearch(message: string): boolean {
  return RESEARCH_RE.test(message);
}

function mentionsCode(message: string): boolean {
  return CODE_RE.test(message);
}

function checksFor(tasks: TaskView[]): Action[] {
  return tasks.map((task) => ({ tool: "check_async_task", taskId: task.taskId }));
}

function newest(tasks: TaskView[]): TaskView | undefined {
  return [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function runAction(
  action: Action,
  api: {
    start: (agent: AgentName, description: string) => TaskView;
    check: (taskId: string) => TaskView;
    update: (taskId: string, message: string) => TaskView;
    cancel: (taskId: string) => TaskView;
    list: () => TaskView[];
  },
): { name: AsyncToolName; args: Record<string, string>; result: string; spoken: string } {
  switch (action.tool) {
    case "start_async_task": {
      const task = api.start(action.agent, action.description);
      const result = `Started ${task.agentName} task ${task.taskId}. Status at launch: ${task.status}. Full task id: ${task.taskId}.`;
      return {
        name: action.tool,
        args: { agentName: action.agent, description: action.description },
        result,
        spoken: `Launched ${task.agentName} as ${task.taskId}. I am not checking it. Ask when you want a status.`,
      };
    }
    case "check_async_task": {
      const task = api.check(action.taskId);
      const result = describeTask(task);
      return {
        name: action.tool,
        args: { taskId: action.taskId },
        result,
        spoken: `Fresh check: ${result}`,
      };
    }
    case "update_async_task": {
      const task = api.update(action.taskId, action.message);
      const result = `Follow-up sent to ${task.taskId}. Status: ${task.status}.`;
      return {
        name: action.tool,
        args: { taskId: action.taskId, message: action.message },
        result,
        spoken: result,
      };
    }
    case "cancel_async_task": {
      const task = api.cancel(action.taskId);
      const result = `Cancelled ${task.taskId}. Status: ${task.status}.`;
      return {
        name: action.tool,
        args: { taskId: action.taskId },
        result,
        spoken: result,
      };
    }
    case "list_async_tasks": {
      const tasks = api.list();
      const result = tasks.map(describeTask).join(" | ");
      return {
        name: action.tool,
        args: {},
        result,
        spoken: `Fresh list: ${result}`,
      };
    }
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function describeTask(task: TaskView): string {
  const result = task.result ? ` Result: ${task.result}` : "";
  return `${task.agentName} ${task.taskId} is ${task.status}.${result}`;
}

function unrelatedReply(message: string): string {
  const product = PRODUCT_RE.exec(message);
  if (product) {
    const left = Number(product[1]);
    const right = Number(product[2]);
    return `${left * right}. Background tasks keep running. This reply is a script, not a model call.`;
  }
  return "I can keep talking while background tasks run. Ask for a research brief, a code task, or a status check. This reply is a script, not a model call.";
}

function cannedResult(task: InternalTask): string {
  const follow = task.followUps.at(-1);
  const followLine = follow ? `\n\nFollow-up applied: ${follow}` : "";
  if (task.agentName === "researcher") {
    return `Simulated result — no model calls.\n\nCanned brief: async subagents return a task id immediately and keep running on a separate Agent Server thread. The lead agent can answer other questions while that thread is still open. The synchronous task tool is a different feature and is not running here.${followLine}`;
  }
  return `Simulated result — no model calls.\n\nCanned snippet, not model output:\n\nexport async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {\n  let last: unknown;\n  for (let i = 0; i < attempts; i += 1) {\n    try {\n      return await fn();\n    } catch (error) {\n      last = error;\n      await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** i));\n    }\n  }\n  throw last;\n}${followLine}`;
}
