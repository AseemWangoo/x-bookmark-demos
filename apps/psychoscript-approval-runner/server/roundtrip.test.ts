import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Host, Runtime, SnapshotError, fromBytes, toBytes, type Snapshot } from "psychoscript"
import { expect, test } from "bun:test"

import type { Decision, PendingCall, RunView } from "../shared/types.ts"
import type { Env } from "./env.ts"
import { readSample } from "./sample.ts"
import { makeGlobals, type ToolHooks } from "./tools.ts"
import { decideRun, startRun } from "./runs.ts"

function testEnv(dataDir: string): Env {
  return { dataDir, port: 0, timeoutMs: 5_000, demo: false }
}

async function withDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "ps-approval-"))
  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test("searchDocs finishes without a snapshot", async () => {
  await withDir(async (dir) => {
    const env = testEnv(dir)
    const view = await startRun(env, `const docs = searchDocs("alpha"); return docs`)
    expect(view.status).toBe("finished")
    expect(view.snapshotBytes).toBeNull()
    expect(view.pending).toBeNull()
    expect(view.result).toEqual({ ok: true, value: { hits: ["doc for alpha"] } })
    expect(await Bun.file(join(dir, `${view.id}.bin`)).exists()).toBe(false)
    expect(view.timeline.map((event) => event.type)).toEqual(["started", "tool", "finished"])
  })
})

test("a risky call suspends and toBytes is non-empty", async () => {
  await withDir(async (dir) => {
    const env = testEnv(dir)
    const view = await startRun(env, `return await sendEmail({ to: "a@b.c", subject: "s", body: "b" })`)
    expect(view.status).toBe("suspended")
    expect(view.pending?.name).toBe("sendEmail")
    const size = snapshotSize(view)
    expect(size).toBeGreaterThan(0)
    const bin = new Uint8Array(await Bun.file(join(dir, `${view.id}.bin`)).arrayBuffer())
    expect(bin.byteLength).toBe(size)
    const paused = view.timeline.find((event) => event.type === "paused")
    expect(paused?.type === "paused" ? paused.snapshotBytes : 0).toBe(bin.byteLength)
  })
})

test("round-trip reads snapshot bytes from disk and resumes on a new runtime", async () => {
  await withDir(async (dir) => {
    const code = `
      const docs = searchDocs("policy")
      const email = await sendEmail({ to: "ops@example.com", subject: "hi", body: "x" })
      return { hits: docs.hits.length, to: email.to, id: email.id }
    `
    const pending = { current: null as PendingCall | null }
    const hooks: ToolHooks = {
      onTool: () => {},
      onPending: (call) => {
        pending.current = call
      },
      decisionFor: () => undefined,
    }
    const first = Runtime.make({
      limits: { timeoutMs: 5_000, maxOutputBytes: 64_000 },
      globals: () => makeGlobals(hooks),
    })
    const program = first.program(code)
    const running = program.run()
    await new Promise((resolve) => setTimeout(resolve, 30))
    const outcome = await program.suspend()
    await running
    expect(outcome.ok).toBe("suspended")
    if (outcome.ok !== "suspended") return
    const bytes = toBytes(outcome.state)
    expect(bytes.byteLength).toBeGreaterThan(0)
    const bin = join(dir, "snap.bin")
    await Bun.write(bin, bytes)
    const fromDisk = new Uint8Array(await Bun.file(bin).arrayBuffer())
    expect(fromDisk.byteLength).toBe(bytes.byteLength)
    const key = pending.current?.key
    expect(typeof key).toBe("string")
    if (!key) return
    const decisions: Record<string, Decision> = { [key]: "approve" }
    const second = Runtime.make({
      limits: { timeoutMs: 5_000, maxOutputBytes: 64_000 },
      globals: () =>
        makeGlobals({
          onTool: () => {},
          onPending: () => {},
          decisionFor: (callKey) => decisions[callKey],
        }),
    })
    const resumed = await second.resume(fromBytes(fromDisk) as Snapshot).run()
    expect(resumed.ok).toBe(true)
    if (resumed.ok !== true) return
    expect(resumed.value).toEqual({ hits: 1, to: "ops@example.com", id: "msg_fixture" })
  })
})

test("reject resumes with Host.fail", async () => {
  await withDir(async (dir) => {
    const env = testEnv(dir)
    const started = await startRun(env, `return await chargeCard({ amountCents: 100, currency: "USD", memo: "no" })`)
    expect(started.status).toBe("suspended")
    const decided = await decideRun(env, started.id, "reject")
    expect(decided.status).toBe("finished")
    expect(decided.result).toEqual({
      ok: false,
      error: { kind: "Rejected", message: "chargeCard was rejected" },
    })
    expect(await Bun.file(join(dir, `${started.id}.bin`)).exists()).toBe(false)
  })
})

test("sample script pauses, approves, then rejects the next call from disk", async () => {
  await withDir(async (dir) => {
    const env = testEnv(dir)
    const sample = await readSample()
    expect(sample).toContain("Hand-authored fixture")
    expect(sample).toContain("Not model output")
    const started = await startRun(env, sample)
    expect(started.pending?.name).toBe("sendEmail")
    const firstSize = snapshotSize(started)
    expect(firstSize).toBeGreaterThan(0)
    console.log("sample snapshot bytes", firstSize)
    const approved = await decideRun(env, started.id, "approve")
    expect(approved.status).toBe("suspended")
    expect(approved.pending?.name).toBe("chargeCard")
    expect(snapshotSize(approved)).toBeGreaterThan(0)
    const rejected = await decideRun(env, started.id, "reject")
    expect(rejected.status).toBe("finished")
    expect(rejected.result?.ok).toBe(true)
    if (rejected.result?.ok !== true) return
    expect(rejected.result.value).toMatchObject({
      stopped: "chargeCard",
      message: "chargeCard was rejected",
    })
    expect(rejected.timeline.map((event) => event.type)).toEqual([
      "started",
      "tool",
      "paused",
      "resumed",
      "tool",
      "paused",
      "resumed",
      "finished",
    ])
  })
})

test("a non-idempotent in-flight call rejects suspend", async () => {
  const runtime = Runtime.make({
    globals: () => ({
      hang: Host.fn(() => new Promise(() => {}), { type: "async" }),
    }),
  })
  const program = runtime.program("return await hang()")
  const controller = new AbortController()
  const running = program.run({ signal: controller.signal })
  try {
    await new Promise((resolve) => setTimeout(resolve, 30))
    await expect(program.suspend()).rejects.toBeInstanceOf(Runtime.SuspendError)
  } finally {
    controller.abort()
    await running.catch(() => {})
  }
})

function snapshotSize(view: RunView): number {
  if (view.snapshotBytes === null) throw new Error("expected a snapshot")
  return view.snapshotBytes
}

test("malformed bytes reject with SnapshotError", async () => {
  const runtime = Runtime.make({ globals: () => ({}) })
  const bytes = new TextEncoder().encode('{"nope":true}')
  await expect(runtime.resume(fromBytes(bytes) as Snapshot).run()).rejects.toBeInstanceOf(SnapshotError)
})
