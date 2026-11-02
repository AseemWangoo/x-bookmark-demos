import { describe, expect, test } from "bun:test"

import { ReplayDriver } from "../server/driver/replay.ts"
import type { CallResult, DesktopDriver } from "../server/driver/types.ts"
import type { Envelope } from "../server/envelope.ts"
import { presetPrompts, TODO_TEXT, type ScenarioId } from "../server/planner/steps.ts"
import { assertRefsBelongToSnapshot, runPrompt, type StepLog } from "../server/runner.ts"

describe("runner replay", () => {
  test("preset 1 replays refs, codes, and a verified readback", async () => {
    const driver = new ReplayDriver({ speed: 1000 })
    const steps: StepLog[] = []
    const result = await runPrompt({
      driver,
      prompt: presetPrompts.todo,
      planner: "scripted",
      onStep: (step) => {
        steps.push(step)
      },
    })
    expect(result.ok).toBe(true)
    expect(steps.map((step) => step.argv[0])).toEqual([
      "launch",
      "wait",
      "snapshot",
      "type",
      "snapshot",
      "get",
      "screenshot",
    ])
    const verify = steps.find((step) => step.intent.startsWith("Verify"))
    expect(verify?.ok).toBe(true)
    expect(verify?.delivery).toBe("delivered_verified")
    expect(verify?.refs[0]).toMatch(/^@[A-Za-z0-9]+:e\d+$/)
    const snapshots = new Map<string, Envelope>()
    for (const step of steps) {
      if (step.envelope.ok && step.envelope.command === "snapshot" && step.snapshotId) {
        snapshots.set(step.snapshotId, step.envelope)
      }
      for (const ref of step.refs) expect(ref).toMatch(/^@[A-Za-z0-9]+:e\d+$/)
      expect(assertRefsBelongToSnapshot(step, snapshots)).toBe(true)
    }
    const value = verify?.envelope.ok ? (verify.envelope.data as { value?: string }).value : ""
    expect(value).toContain(TODO_TEXT)
  })

  test("a STALE_REF triggers one re-snapshot and one retry", async () => {
    const driver = new StaleDriver()
    const steps: StepLog[] = []
    const result = await runPrompt({
      driver,
      prompt: presetPrompts.todo,
      planner: "scripted",
      onStep: (step) => {
        steps.push(step)
      },
    })
    expect(result.ok).toBe(true)
    expect(driver.snapshots).toBe(3)
    expect(driver.types).toBe(2)
    expect(steps.filter((step) => step.code === "STALE_REF")).toHaveLength(1)
    expect(steps.filter((step) => step.intent === "Re-snapshot after STALE_REF")).toHaveLength(1)
  })
})

class StaleDriver implements DesktopDriver {
  readonly kind = "live" as const
  snapshots = 0
  types = 0

  prepare(_scenario: ScenarioId): Promise<void> {
    return Promise.resolve()
  }

  status(): Promise<CallResult> {
    return Promise.resolve(ok(["status"], "status", {}))
  }

  listApps(): Promise<CallResult> {
    return Promise.resolve(ok(["list-apps"], "list-apps", { apps: [] }))
  }

  sessionStart(name: string): Promise<CallResult> {
    return Promise.resolve(ok(["session", "start", "--name", name], "session", { session_id: "fake" }))
  }

  sessionEnd(sessionId: string): Promise<CallResult> {
    return Promise.resolve(ok(["session", "end", sessionId], "session", { session_id: sessionId }))
  }

  launch(app: string): Promise<CallResult> {
    return Promise.resolve(ok(["launch", app], "launch", { app }))
  }

  waitForWindow(app: string, title: string): Promise<CallResult> {
    return Promise.resolve(ok(["wait", "--window", title, "--app", app], "wait", { found: true }))
  }

  pause(ms: number): Promise<CallResult> {
    return Promise.resolve(ok(["wait", String(ms)], "wait", { elapsed_ms: ms }))
  }

  snapshot(app: string): Promise<CallResult> {
    this.snapshots += 1
    const snapshotId = `s${this.snapshots}`
    return Promise.resolve(
      ok(["snapshot", "--app", app, "-i", "--compact"], "snapshot", {
        app,
        snapshot_id: snapshotId,
        ref_count: 1,
        complete: true,
        tree: {
          role: "textfield",
          ref_id: `@${snapshotId}:e2`,
          available_actions: ["TypeText"],
        },
      }),
    )
  }

  click(ref: string): Promise<CallResult> {
    return Promise.resolve(ok(["click", ref], "click", { disposition: { delivery: "delivered_unverified", retry: "unsafe" } }))
  }

  typeText(ref: string, text: string): Promise<CallResult> {
    this.types += 1
    if (this.types === 1) {
      return Promise.resolve({
        argv: ["type", ref, text],
        ms: 1,
        stderr: "",
        envelope: {
          version: "2.5",
          ok: false,
          command: "type",
          error: {
            code: "STALE_REF",
            message: `${ref} not found`,
            disposition: { delivery: "not_delivered", retry: "safe" },
          },
        },
      })
    }
    return Promise.resolve(
      ok(["type", ref, text], "type", {
        disposition: { delivery: "delivered_verified", retry: "unsafe" },
        steps: [{ mechanism: "semantic_api", label: "EditableText.InsertText" }],
        post_state: { value: text },
      }),
    )
  }

  getValue(ref: string): Promise<CallResult> {
    return Promise.resolve(ok(["get", ref, "--property", "value"], "get", { property: "value", ref, value: TODO_TEXT }))
  }

  screenshot(app: string, filePath: string): Promise<CallResult> {
    return Promise.resolve(ok(["screenshot", "--app", app, filePath], "screenshot", { path: filePath, format: "png" }))
  }

  closeApp(app: string): Promise<CallResult> {
    return Promise.resolve(ok(["close-app", app], "close-app", { app }))
  }

  traceShow(): Promise<CallResult> {
    return Promise.resolve(ok(["trace", "show"], "trace", { events: [] }))
  }

  idleSnapshot(): Promise<CallResult | null> {
    return Promise.resolve(null)
  }

  idleScreenshot(): string | null {
    return null
  }
}

function ok(argv: string[], command: string, data: unknown): CallResult {
  return {
    argv,
    ms: 1,
    stderr: "",
    envelope: { version: "2.5", ok: true, command, data },
  }
}
