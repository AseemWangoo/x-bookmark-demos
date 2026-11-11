import { describe, expect, test } from "bun:test";

import { createMockAdapter } from "../server/adapter/mock.ts";
import { createApp } from "../server/http.ts";
import { MOCK_BANNER } from "../shared/port.ts";

describe("port http", () => {
  test("serves mode and fixtures", async () => {
    const app = createApp(createMockAdapter());
    const mode = await app.handle(new Request("http://port.local/api/mode"));
    const payload = (await mode.json()) as { banner: string; mode: string };
    expect(payload.mode).toBe("mock");
    expect(payload.banner).toBe(MOCK_BANNER);

    const fixtures = await app.handle(new Request("http://port.local/api/fixtures"));
    const listed = (await fixtures.json()) as { fixtures: Array<{ id: string; source: string }> };
    expect(listed.fixtures).toHaveLength(3);
    expect(listed.fixtures[0]?.source).toContain("paddle");
  });

  test("rejects an empty source and an unknown effort", async () => {
    const app = createApp(createMockAdapter());
    const empty = await app.handle(
      new Request("http://port.local/api/port", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "   ", effort: "medium" }),
      }),
    );
    expect(empty.status).toBe(400);
    const minimal = await app.handle(
      new Request("http://port.local/api/port", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "x", effort: "minimal" }),
      }),
    );
    expect(minimal.status).toBe(400);
  });
});
