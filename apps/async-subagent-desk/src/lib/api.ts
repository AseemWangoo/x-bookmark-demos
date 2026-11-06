import type { DeskMode, TaskView } from "../../shared/desk.ts";
import { ASYNC_TOOL_NAMES } from "../../shared/desk.ts";

export type ModePayload = {
  mode: DeskMode;
  simulated: boolean;
  banner: string;
  detail: string;
  commands: readonly string[];
  tools: typeof ASYNC_TOOL_NAMES;
};

export type ServerEvent =
  | { type: "meta"; mode: DeskMode; simulated: boolean; threadId: string }
  | { type: "token"; text: string }
  | { type: "tool"; name: string; args: Record<string, string>; result: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function fetchMode(): Promise<ModePayload> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error("Could not read desk mode.");
  return (await response.json()) as ModePayload;
}

export async function fetchTasks(): Promise<TaskView[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as TaskView[];
}

export async function postTaskAction(
  taskId: string,
  action: "check" | "update" | "cancel",
  body?: { message: string },
): Promise<TaskView> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as TaskView;
}

export async function streamChat(
  body: { message: string; threadId?: string },
  onEvent: (event: ServerEvent) => void,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    throw new Error(await errorMessage(response));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(6)) as ServerEvent);
    }
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || response.statusText;
  } catch {
    return response.statusText;
  }
}
