import type { AsyncToolName, DeskMode, TaskView } from "../../shared/desk.ts";

export type ToolEvent = {
  name: AsyncToolName;
  args: Record<string, string>;
  result: string;
};

export type ChatEvent =
  | { type: "token"; text: string }
  | { type: "tool"; tool: ToolEvent };

export type ChatInput = {
  threadId?: string;
  message: string;
};

export type DeskBackend = {
  readonly mode: DeskMode;
  readonly simulated: boolean;
  chat(
    input: ChatInput,
    emit: (event: ChatEvent) => void | Promise<void>,
  ): Promise<{ threadId: string }>;
  listTasks(): Promise<TaskView[]>;
  check(taskId: string): Promise<TaskView>;
  update(taskId: string, message: string): Promise<TaskView>;
  cancel(taskId: string): Promise<TaskView>;
};

export class DeskError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
