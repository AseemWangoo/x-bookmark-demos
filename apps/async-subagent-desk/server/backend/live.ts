import { Client } from "@langchain/langgraph-sdk";

import {
  isAsyncToolName,
  isTerminalStatus,
  type AgentName,
  type AsyncToolName,
  type TaskStatus,
  type TaskView,
} from "../../shared/desk.ts";
import { DeskError, type ChatEvent, type ChatInput, type DeskBackend } from "./types.ts";

const SUPERVISOR_GRAPH_ID = "agent";

type Tracked = {
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
  lastAction?: AsyncToolName;
};

export function createLiveBackend(options: { apiUrl: string }): DeskBackend {
  const client = new Client({ apiUrl: options.apiUrl });
  const tasks = new Map<string, Tracked>();
  const partials = new Map<string, string>();
  const seenToolMessages = new Set<string>();
  const toolCalls = new Map<string, { name: string; args: Record<string, string> }>();
  let supervisorThreadId: string | undefined;

  function toView(task: Tracked): TaskView {
    return {
      taskId: task.taskId,
      agentName: task.agentName,
      threadId: task.threadId,
      runId: task.runId,
      status: task.status,
      description: task.description,
      createdAt: task.createdAt,
      ...(task.updatedAt ? { updatedAt: task.updatedAt } : {}),
      ...(task.checkedAt ? { checkedAt: task.checkedAt } : {}),
      ...(task.result ? { result: task.result } : {}),
      simulated: false,
      ...(task.lastAction ? { lastAction: task.lastAction } : {}),
    };
  }

  function requireTask(taskId: string): Tracked {
    const task = tasks.get(taskId);
    if (!task) throw new DeskError(404, `No task ${taskId}.`);
    return task;
  }

  function ingestAsyncTasks(values: unknown): void {
    const record = asRecord(values);
    const raw = record?.asyncTasks;
    if (!raw || typeof raw !== "object") return;
    for (const value of Object.values(raw)) {
      const task = asRecord(value);
      if (!task) continue;
      const taskId = stringField(task, "taskId");
      const agentName = stringField(task, "agentName");
      const threadId = stringField(task, "threadId");
      const runId = stringField(task, "runId");
      const status = stringField(task, "status");
      const createdAt = stringField(task, "createdAt");
      if (!taskId || !threadId || !runId || !createdAt) continue;
      if (agentName !== "researcher" && agentName !== "coder") continue;
      if (!isTaskStatus(status)) continue;
      const existing = tasks.get(taskId);
      tasks.set(taskId, {
        taskId,
        agentName,
        threadId,
        runId,
        status,
        description:
          stringField(task, "description") ||
          existing?.description ||
          `${agentName} task`,
        createdAt,
        ...(stringField(task, "updatedAt") || existing?.updatedAt
          ? { updatedAt: stringField(task, "updatedAt") || existing?.updatedAt }
          : {}),
        ...(stringField(task, "checkedAt") || existing?.checkedAt
          ? { checkedAt: stringField(task, "checkedAt") || existing?.checkedAt }
          : {}),
        ...(existing?.result ? { result: existing.result } : {}),
        ...(existing?.lastAction ? { lastAction: existing.lastAction } : {}),
      });
    }
  }

  async function refresh(task: Tracked): Promise<Tracked> {
    try {
      const run = await client.runs.get(task.threadId, task.runId);
      const thread = await client.threads.get(task.threadId);
      const waiting = Object.keys(thread.interrupts ?? {}).length > 0;
      task.status = mapRunStatus(run.status, waiting);
      task.updatedAt = run.updated_at;
      if (task.status === "success" && !task.result) {
        task.result = await readFinalText(client, task.threadId);
      }
    } catch (error) {
      if (isNotFound(error)) throw new DeskError(404, `Task ${task.taskId} was not found on the Agent Server.`);
      throw new DeskError(502, errorText(error));
    }
    return task;
  }

  async function pullSupervisor(): Promise<void> {
    if (!supervisorThreadId) return;
    try {
      const state = await client.threads.getState(supervisorThreadId);
      ingestAsyncTasks(state.values);
    } catch (error) {
      throw new DeskError(502, errorText(error));
    }
  }

  return {
    mode: "live",
    simulated: false,
    async listTasks() {
      await pullSupervisor();
      const refreshed = await Promise.all(
        [...tasks.values()].map(async (task) => {
          if (isTerminalStatus(task.status) && (task.status !== "success" || task.result)) {
            return task;
          }
          return refresh(task);
        }),
      );
      return refreshed
        .map(toView)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async check(taskId) {
      await pullSupervisor();
      const task = await refresh(requireTask(taskId));
      task.checkedAt = new Date().toISOString();
      task.lastAction = "check_async_task";
      return toView(task);
    },
    async update(taskId, message) {
      const trimmed = message.trim();
      if (!trimmed) throw new DeskError(400, "Follow-up is empty.");
      await pullSupervisor();
      const task = requireTask(taskId);
      if (task.status === "cancelled") {
        throw new DeskError(409, `Task ${taskId} is cancelled.`);
      }
      try {
        const run = await client.runs.create(task.threadId, task.agentName, {
          input: { messages: [{ role: "user", content: trimmed }] },
          multitaskStrategy: "interrupt",
        });
        task.runId = run.run_id;
        task.status = "running";
        task.updatedAt = new Date().toISOString();
        task.result = undefined;
        task.description = `${task.description}\nFollow-up: ${trimmed}`;
        task.lastAction = "update_async_task";
        return toView(task);
      } catch (error) {
        throw new DeskError(502, errorText(error));
      }
    },
    async cancel(taskId) {
      await pullSupervisor();
      const task = requireTask(taskId);
      if (task.status === "success" || task.status === "error" || task.status === "timeout") {
        throw new DeskError(409, `Task ${taskId} is already ${task.status}.`);
      }
      try {
        await client.runs.cancel(task.threadId, task.runId, false, "interrupt");
      } catch (error) {
        throw new DeskError(502, errorText(error));
      }
      task.status = "cancelled";
      task.updatedAt = new Date().toISOString();
      task.lastAction = "cancel_async_task";
      return toView(task);
    },
    async chat(input: ChatInput, emit) {
      const message = input.message.trim();
      if (!message) throw new DeskError(400, "Message is empty.");
      try {
        if (!supervisorThreadId) {
          const thread = await client.threads.create({
            graphId: SUPERVISOR_GRAPH_ID,
            metadata: { desk: "async-subagent-desk" },
          });
          supervisorThreadId = thread.thread_id;
        }
        if (input.threadId && input.threadId !== supervisorThreadId) {
          supervisorThreadId = input.threadId;
        }
        const stream = client.runs.stream(supervisorThreadId, SUPERVISOR_GRAPH_ID, {
          input: { messages: [{ role: "user", content: message }] },
          streamMode: ["messages-tuple", "values"],
        });
        for await (const part of stream) {
          await handlePart(part, {
            ingestAsyncTasks,
            emit,
            partials,
            seenToolMessages,
            toolCalls,
          });
        }
        await pullSupervisor();
        return { threadId: supervisorThreadId };
      } catch (error) {
        if (error instanceof DeskError) throw error;
        throw new DeskError(502, errorText(error));
      }
    },
  };
}

async function handlePart(
  part: { event: string; data: unknown },
  ctx: {
    ingestAsyncTasks: (values: unknown) => void;
    emit: (event: ChatEvent) => void | Promise<void>;
    partials: Map<string, string>;
    seenToolMessages: Set<string>;
    toolCalls: Map<string, { name: string; args: Record<string, string> }>;
  },
): Promise<void> {
  if (part.event === "values") {
    ctx.ingestAsyncTasks(part.data);
    return;
  }
  if (part.event === "error") {
    const record = asRecord(part.data);
    throw new DeskError(502, stringField(record ?? {}, "message") || "Agent Server stream error.");
  }
  if (part.event !== "messages" && part.event !== "messages/partial" && part.event !== "messages/complete") {
    return;
  }
  const message = Array.isArray(part.data) ? part.data[0] : part.data;
  const record = asRecord(message);
  if (!record) return;
  rememberToolCalls(record, ctx.toolCalls);
  const type = stringField(record, "type") || stringField(record, "role");
  if (type === "tool") {
    await emitToolMessage(record, ctx);
    return;
  }
  if (type !== "ai" && type !== "assistant") return;
  const id = stringField(record, "id") || "ai";
  const text = textContent(record.content);
  if (!text) return;
  const previous = ctx.partials.get(id) ?? "";
  const delta = text.startsWith(previous) ? text.slice(previous.length) : text;
  ctx.partials.set(id, text.startsWith(previous) ? text : previous + text);
  if (delta) await ctx.emit({ type: "token", text: delta });
}

function rememberToolCalls(
  record: Record<string, unknown>,
  toolCalls: Map<string, { name: string; args: Record<string, string> }>,
): void {
  const calls = record.tool_calls;
  if (!Array.isArray(calls)) return;
  for (const call of calls) {
    const item = asRecord(call);
    if (!item) continue;
    const id = stringField(item, "id");
    const name = stringField(item, "name");
    if (!id || !name) continue;
    toolCalls.set(id, { name, args: stringArgs(item.args) });
  }
}

async function emitToolMessage(
  record: Record<string, unknown>,
  ctx: {
    emit: (event: ChatEvent) => void | Promise<void>;
    seenToolMessages: Set<string>;
    toolCalls: Map<string, { name: string; args: Record<string, string> }>;
  },
): Promise<void> {
  const callId = stringField(record, "tool_call_id") || stringField(record, "id") || "";
  if (callId && ctx.seenToolMessages.has(callId)) return;
  const known = callId ? ctx.toolCalls.get(callId) : undefined;
  const name = stringField(record, "name") || known?.name || "";
  if (!isAsyncToolName(name)) return;
  if (callId) ctx.seenToolMessages.add(callId);
  await ctx.emit({
    type: "tool",
    tool: {
      name,
      args: known?.args ?? {},
      result: textContent(record.content),
    },
  });
}

async function readFinalText(client: Client, threadId: string): Promise<string | undefined> {
  const state = await client.threads.getState(threadId);
  const messages = asRecord(state.values)?.messages;
  if (!Array.isArray(messages)) return undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = asRecord(messages[index]);
    if (!message) continue;
    const type = stringField(message, "type") || stringField(message, "role");
    if (type !== "ai" && type !== "assistant") continue;
    const text = textContent(message.content).trim();
    if (text) return text;
  }
  return undefined;
}

function mapRunStatus(status: string, waiting: boolean): TaskStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "running":
      return "running";
    case "error":
      return "error";
    case "success":
      return "success";
    case "timeout":
      return "timeout";
    case "interrupted":
      return waiting ? "waiting" : "interrupted";
    default:
      return waiting ? "waiting" : "running";
  }
}

function isTaskStatus(value: string | undefined): value is TaskStatus {
  switch (value) {
    case "pending":
    case "running":
    case "waiting":
    case "success":
    case "error":
    case "cancelled":
    case "timeout":
    case "interrupted":
      return true;
    default:
      return false;
  }
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      const record = asRecord(part);
      return record && typeof record.text === "string" ? record.text : "";
    })
    .join("");
}

function stringArgs(value: unknown): Record<string, string> {
  const record = asRecord(value);
  if (!record) return {};
  const args: Record<string, string> = {};
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === "string") args[key] = item;
    else if (item != null) args[key] = JSON.stringify(item);
  }
  return args;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isNotFound(error: unknown): boolean {
  const record = asRecord(error);
  const status = record?.status ?? record?.statusCode;
  return status === 404;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Agent Server request failed.";
}
