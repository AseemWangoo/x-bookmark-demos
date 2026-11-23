import { describe, expect, test } from "bun:test";
import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { LIVE_REQUIRED, RECORDED_LABEL, SUMMARY_FILENAME } from "../shared/copy.ts";
import { RECORDED_METRICS, RECORDED_SUMMARY } from "../shared/fixtures/recorded.ts";
import { tokensPerSec } from "../shared/metrics.ts";
import type { AgentEvent, AgentResult } from "../shared/types.ts";
import { FIXTURE_POCKET } from "./roots.ts";
import { runMock } from "./agent.ts";

async function collect(rootId: "fixture" | "custom", root: string): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of runMock({ root, rootId, model: "inkling-2-mini", delayMs: 0 })) {
    events.push(event);
  }
  return events;
}

function resultOf(events: AgentEvent[]): AgentResult {
  const last = events.filter((event) => event.type === "result").at(-1);
  if (!last || last.type !== "result") throw new Error("missing result");
  return last.result;
}

describe("recorded mock", () => {
  test("replays the fixture script, tags, and hand-authored summary", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "pocket-mock-"));
    await cp(FIXTURE_POCKET, root, { recursive: true });
    const events = await collect("fixture", root);
    const result = resultOf(events);
    expect(result.source).toBe("mock");
    expect(result.recorded).toBe(true);
    expect(result.offline).toBe(false);
    expect(result.message).toBe(RECORDED_LABEL);
    expect(result.model).toBe(RECORDED_METRICS.model);
    expect(result.ttftMs).toBe(RECORDED_METRICS.ttftMs);
    expect(result.turns).toBe(RECORDED_METRICS.turns);
    expect(result.tokensPerSec).toBeCloseTo(
      tokensPerSec({
        completionTokens: RECORDED_METRICS.usage.outputTokens,
        ttftMs: RECORDED_METRICS.ttftMs,
        wallMs: RECORDED_METRICS.wallMs,
      }) ?? 0,
      8,
    );
    expect(result.summaryMarkdown).toBe(RECORDED_SUMMARY);
    expect(result.trace.map((entry) => entry.name)).toContain("write_summary");
    expect(result.trace.some((entry) => entry.name === "rejected")).toBe(false);
    const grocery = result.files.find((file) => file.path === "grocery-list.md");
    expect(grocery?.tags).toEqual(["note", "shopping"]);
    const summary = await Bun.file(path.join(root, SUMMARY_FILENAME)).text();
    expect(summary).toContain("Hand-authored recorded summary");
    const sidecar = await Bun.file(path.join(root, ".pocket/tags.json")).json();
    expect(sidecar["cafe-receipt.txt"]).toEqual(["receipt", "food"]);
  });

  test("does not invent a summary for a folder that is not the fixture", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "pocket-custom-"));
    await Bun.write(path.join(root, "mine.md"), "my own note\n");
    const events = await collect("custom", root);
    const result = resultOf(events);
    expect(result.message).toBe(LIVE_REQUIRED);
    expect(result.summaryPath).toBeNull();
    expect(result.trace).toEqual([]);
    expect(result.files.map((file) => file.path)).toEqual(["mine.md"]);
    expect(await Bun.file(path.join(root, SUMMARY_FILENAME)).exists()).toBe(false);
    expect(events.some((event) => event.type === "trace")).toBe(false);
  });
});
