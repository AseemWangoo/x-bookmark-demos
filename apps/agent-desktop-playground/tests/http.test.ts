import { describe, expect, test } from "bun:test"

import { createRuntime, handle } from "../server/http.ts"

describe("http", () => {
  test("mode and apps in replay do not need a binary", async () => {
    const runtime = await createRuntime({
      MODE: "replay",
      AGENT_DESKTOP_BIN: "/tmp/agent-desktop-missing-binary",
      REPLAY_SPEED: "1000",
    })
    expect(runtime.decision.mode).toBe("replay")
    expect(runtime.driver.kind).toBe("replay")
    const mode = await handle(new Request("http://127.0.0.1/api/mode"), runtime)
    expect(mode.status).toBe(200)
    const modeBody = (await mode.json()) as { mode: string; reason: string }
    expect(modeBody.mode).toBe("replay")
    expect(modeBody.reason).toBe("MODE=replay")
    const apps = await handle(new Request("http://127.0.0.1/api/apps"), runtime)
    expect(apps.status).toBe(200)
    const body = (await apps.json()) as { ok: boolean; data?: { apps?: { name: string }[] } }
    expect(body.ok).toBe(true)
    const names = body.data?.apps?.map((app) => app.name) ?? []
    expect(names).toContain("gnome-text-editor")
    expect(names).toContain("gnome-calculator")
  })
})
