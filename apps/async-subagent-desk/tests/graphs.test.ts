import { describe, expect, test } from "bun:test";

import { graph as coder } from "../graphs/coder.ts";
import { graph as researcher } from "../graphs/researcher.ts";
import { graph as supervisor } from "../graphs/supervisor.ts";

describe("live graph modules", () => {
  test("langgraph.ts.json co-deploys agent, researcher, and coder", async () => {
    const config = JSON.parse(
      await Bun.file(new URL("../langgraph.ts.json", import.meta.url)).text(),
    ) as { graphs: Record<string, string> };
    expect(Object.keys(config.graphs).sort()).toEqual(["agent", "coder", "researcher"]);
    expect(config.graphs.agent).toBe("./graphs/supervisor.ts:graph");
    expect(config.graphs.researcher).toBe("./graphs/researcher.ts:graph");
    expect(config.graphs.coder).toBe("./graphs/coder.ts:graph");
  });

  test("supervisor source uses AsyncSubAgent graph ids, not the stale option name", async () => {
    const source = await Bun.file(new URL("../graphs/supervisor.ts", import.meta.url)).text();
    expect(source).toContain('graphId: "researcher"');
    expect(source).toContain('graphId: "coder"');
    expect(source).toContain('updateStrategy: "interrupt"');
    expect(source).toContain("subagents:");
    expect(source).not.toContain("asyncSubagents");
    expect(supervisor).toBeDefined();
    expect(researcher).toBeDefined();
    expect(coder).toBeDefined();
  });
});
