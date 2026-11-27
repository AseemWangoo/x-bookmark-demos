import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "bun:test"

import type { RunView } from "../shared/types.ts"
import type { Env } from "./env.ts"
import { createApp } from "./http.ts"
import { readSample } from "./sample.ts"

function testEnv(dataDir: string): Env {
  return { dataDir, port: 0, timeoutMs: 5_000, demo: false }
}

test("a new app reads the snapshot from disk and resumes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ps-http-"))
  try {
    const env = testEnv(dir)
    const first = createApp(env)
    const sample = await readSample()
    const started = await postJson(first, "/api/runs", { code: sample })
    expect(started.status).toBe(201)
    const view = (await started.json()) as RunView
    expect(view.status).toBe("suspended")
    expect(snapshotSize(view)).toBeGreaterThan(0)
    const bin = Bun.file(join(dir, `${view.id}.bin`))
    expect(await bin.exists()).toBe(true)

    const restarted = createApp(env)
    const loaded = await restarted.handle(new Request(`http://127.0.0.1/api/runs/${view.id}`))
    expect(loaded.status).toBe(200)
    const again = (await loaded.json()) as RunView
    expect(again.pending?.name).toBe("sendEmail")
    expect(again.snapshotBytes).toBe(snapshotSize(view))

    const decided = await postJson(restarted, `/api/runs/${view.id}/decide`, { decision: "approve" })
    expect(decided.status).toBe(200)
    const next = (await decided.json()) as RunView
    expect(next.pending?.name).toBe("chargeCard")
    expect(snapshotSize(next)).toBeGreaterThan(0)
    expect(next.timeline.some((event) => event.type === "resumed" && event.decision === "approve")).toBe(true)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("bad syntax and a missing run are errors", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ps-http-"))
  try {
    const app = createApp(testEnv(dir))
    const bad = await postJson(app, "/api/runs", { code: "function (" })
    expect(bad.status).toBe(400)
    const missing = await app.handle(new Request("http://127.0.0.1/api/runs/not-a-uuid"))
    expect(missing.status).toBe(400)
    const absent = await app.handle(
      new Request("http://127.0.0.1/api/runs/00000000-0000-0000-0000-000000000000"),
    )
    expect(absent.status).toBe(404)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

function snapshotSize(view: RunView): number {
  if (view.snapshotBytes === null) throw new Error("expected a snapshot")
  return view.snapshotBytes
}

async function postJson(
  app: ReturnType<typeof createApp>,
  path: string,
  body: unknown,
): Promise<Response> {
  return app.handle(
    new Request(`http://127.0.0.1${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  )
}
