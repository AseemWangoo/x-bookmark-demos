import { describe, expect, test } from "bun:test";

import { createManualClock } from "../server/clock.ts";
import { createMockBackend } from "../server/backend/mock.ts";
import { ASYNC_TOOL_NAMES, MOCK_TIMING, SIMULATED_BANNER, type TaskView } from "../shared/desk.ts";
import type { ChatEvent } from "../server/backend/types.ts";

const RESEARCH = "Write a competitive research brief on async agent runtimes.";
const BOTH =
  "Research async subagents and sketch a tiny supervisor loop. I'll keep chatting while you work.";

async function say(backend: ReturnType<typeof createMockBackend>, message: string) {
  const events: ChatEvent[] = [];
  await backend.chat({ message }, (event) => {
    events.push(event);
  });
  return events;
}

function tools(events: ChatEvent[]) {
  return events.filter((event) => event.type === "tool");
}

function text(events: ChatEvent[]) {
  return events
    .filter((event) => event.type === "token")
    .map((event) => event.text)
    .join("");
}

describe("mock async desk", () => {
  test("exposes only the five async tool names", () => {
    expect([...ASYNC_TOOL_NAMES]).toEqual([
      "start_async_task",
      "check_async_task",
      "update_async_task",
      "cancel_async_task",
      "list_async_tasks",
    ]);
    expect(ASYNC_TOOL_NAMES.includes("task" as never)).toBe(false);
  });

  test("start returns immediately and does not check", async () => {
    const clock = createManualClock(1_700_000_000_000);
    const backend = createMockBackend({ clock, tokenDelayMs: 0 });
    const events = await say(backend, RESEARCH);
    const names = tools(events).map((event) => event.tool.name);
    expect(names).toEqual(["start_async_task"]);
    expect(text(events)).not.toContain("success");
    expect(text(events)).toContain(SIMULATED_BANNER);
    const [task] = await backend.listTasks();
    expect(task?.status).toBe("pending");
    expect(task?.simulated).toBe(true);
    expect(task?.result).toBeUndefined();
  });

  test("both tasks stay running while an unrelated reply is returned", async () => {
    const clock = createManualClock(1_700_000_000_000);
    const backend = createMockBackend({ clock, tokenDelayMs: 0 });
    const started = await say(backend, BOTH);
    expect(tools(started).map((event) => event.tool.name)).toEqual([
      "start_async_task",
      "start_async_task",
    ]);
    clock.advance(2_000);
    const events = await say(backend, "What's 17 * 23?");
    expect(tools(events)).toHaveLength(0);
    expect(text(events)).toContain("391");
    expect(text(events)).toContain(SIMULATED_BANNER);
    const tasks = await backend.listTasks();
    expect(tasks.map((task) => task.agentName).sort()).toEqual(["coder", "researcher"]);
    expect(tasks.every((task) => task.status === "running")).toBe(true);
  });

  test("status checks the live state instead of the launch message", async () => {
    const clock = createManualClock(1_700_000_000_000);
    const backend = createMockBackend({ clock, tokenDelayMs: 0 });
    const started = await say(backend, RESEARCH);
    const firstTool = tools(started)[0];
    expect(firstTool?.type).toBe("tool");
    expect(text(started).toLowerCase()).not.toContain("is success");
    clock.advance(MOCK_TIMING.researcherMs);
    const events = await say(backend, "How's the research going?");
    const check = tools(events)[0];
    expect(check?.type).toBe("tool");
    if (check?.type !== "tool") return;
    expect(check.tool.name).toBe("check_async_task");
    expect(check.tool.result).toContain("is success");
    expect(events[0]?.type).toBe("tool");
    expect(text(events)).toContain("is success");
    expect(text(events)).toContain("Simulated result — no model calls");
    const [task] = await backend.listTasks();
    expect(task?.status).toBe("success");
    expect(task?.result).toContain("Simulated result — no model calls");
  });

  test("follow-up interrupts and cancel sticks", async () => {
    const clock = createManualClock(1_700_000_000_000);
    const backend = createMockBackend({ clock, tokenDelayMs: 0 });
    await say(backend, "Write a small TypeScript function that retries a flaky fetch with backoff.");
    clock.advance(1_000);
    const [coder] = await backend.listTasks();
    expect(coder?.status).toBe("running");
    const followed = await backend.update(
      coder!.taskId,
      "Prefer exponential backoff with jitter.",
    );
    expect(followed.status).toBe("running");
    expect(followed.description).toContain("jitter");
    expect(followed.lastAction).toBe("update_async_task");
    clock.advance(8_000);
    const done = await backend.check(followed.taskId);
    expect(done.status).toBe("success");
    expect(done.result).toContain("jitter");
    expect(done.result).toContain("Simulated result — no model calls");
    expect(done.lastAction).toBe("check_async_task");

    await say(backend, "Write a small TypeScript function that retries a flaky fetch with backoff.");
    clock.advance(500);
    const running = (await backend.listTasks()).find(
      (task) => task.taskId !== coder!.taskId && task.status === "running",
    ) as TaskView;
    const cancelled = await backend.cancel(running.taskId);
    expect(cancelled.status).toBe("cancelled");
    clock.advance(60_000);
    const still = await backend.check(running.taskId);
    expect(still.status).toBe("cancelled");
    expect(still.result).toBeUndefined();
  });
});
