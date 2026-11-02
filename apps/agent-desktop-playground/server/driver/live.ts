import { mkdirSync } from "node:fs"
import path from "node:path"

import { buildArgv, resolveAgentDesktopBin } from "../bin.ts"
import { parseEnvelope, syntheticTimeout, type Envelope } from "../envelope.ts"
import type { ScenarioId } from "../planner/steps.ts"
import type { CallResult, DesktopDriver } from "./types.ts"

const DEFAULT_TIMEOUT_MS = 20_000

export class LiveDriver implements DesktopDriver {
  readonly kind = "live" as const
  private readonly bin: string

  constructor(bin = resolveAgentDesktopBin()) {
    this.bin = bin
  }

  prepare(_scenario: ScenarioId): Promise<void> {
    return Promise.resolve()
  }

  status(): Promise<CallResult> {
    return this.call(["status"], null, DEFAULT_TIMEOUT_MS)
  }

  listApps(): Promise<CallResult> {
    return this.call(["list-apps"], null, DEFAULT_TIMEOUT_MS)
  }

  sessionStart(name: string): Promise<CallResult> {
    return this.call(["session", "start", "--name", name], null, DEFAULT_TIMEOUT_MS)
  }

  sessionEnd(sessionId: string): Promise<CallResult> {
    return this.call(["session", "end", sessionId], sessionId, DEFAULT_TIMEOUT_MS)
  }

  launch(app: string, sessionId: string): Promise<CallResult> {
    return this.call(["launch", app], sessionId, DEFAULT_TIMEOUT_MS)
  }

  waitForWindow(app: string, title: string, timeoutMs: number, sessionId: string): Promise<CallResult> {
    return this.call(
      ["wait", "--window", title, "--app", app, "--timeout", String(timeoutMs)],
      sessionId,
      timeoutMs + 5_000,
    )
  }

  pause(ms: number, sessionId: string): Promise<CallResult> {
    return this.call(["wait", String(ms)], sessionId, ms + 5_000)
  }

  snapshot(app: string, sessionId: string): Promise<CallResult> {
    return this.call(["snapshot", "--app", app, "-i", "--compact"], sessionId, DEFAULT_TIMEOUT_MS)
  }

  click(ref: string, sessionId: string): Promise<CallResult> {
    return this.call(["click", ref], sessionId, DEFAULT_TIMEOUT_MS)
  }

  typeText(ref: string, text: string, sessionId: string): Promise<CallResult> {
    return this.call(["type", ref, text], sessionId, DEFAULT_TIMEOUT_MS)
  }

  getValue(ref: string, sessionId: string): Promise<CallResult> {
    return this.call(["get", ref, "--property", "value"], sessionId, DEFAULT_TIMEOUT_MS)
  }

  screenshot(app: string, filePath: string, sessionId: string): Promise<CallResult> {
    mkdirSync(path.dirname(filePath), { recursive: true })
    return this.call(["screenshot", "--app", app, filePath], sessionId, DEFAULT_TIMEOUT_MS)
  }

  closeApp(app: string, sessionId: string | null): Promise<CallResult> {
    return this.call(["close-app", "--force", app], sessionId, DEFAULT_TIMEOUT_MS)
  }

  traceShow(sessionId: string): Promise<CallResult> {
    return this.call(["trace", "show", "--limit", "100"], sessionId, DEFAULT_TIMEOUT_MS)
  }

  idleSnapshot(_app: string): Promise<CallResult | null> {
    return Promise.resolve(null)
  }

  idleScreenshot(_app: string): string | null {
    return null
  }

  private async call(command: readonly string[], sessionId: string | null, timeoutMs: number): Promise<CallResult> {
    const argv = buildArgv(command, sessionId)
    const started = Date.now()
    try {
      const proc = Bun.spawn([this.bin, ...argv], {
        stdout: "pipe",
        stderr: "pipe",
        stdin: "ignore",
        signal: AbortSignal.timeout(timeoutMs),
      })
      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()
      await proc.exited
      const envelope = parseEnvelope(stdout)
      return { envelope, argv, ms: Date.now() - started, stderr }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const aborted = message.toLowerCase().includes("abort") || message.toLowerCase().includes("timeout")
      const envelope: Envelope = aborted
        ? syntheticTimeout(command[0] ?? "unknown", timeoutMs)
        : {
            version: "2.5",
            ok: false,
            command: command[0] ?? "unknown",
            error: {
              code: "INTERNAL",
              message,
              disposition: { delivery: "unknown", retry: "unsafe" },
            },
          }
      return { envelope, argv, ms: Date.now() - started, stderr: message }
    }
  }
}
