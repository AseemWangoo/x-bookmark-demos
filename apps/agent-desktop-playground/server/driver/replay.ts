import { readdirSync, readFileSync, existsSync } from "node:fs"
import path from "node:path"

import { appRoot } from "../bin.ts"
import { liveRequired, parseEnvelope, type Envelope } from "../envelope.ts"
import type { ScenarioId } from "../planner/steps.ts"
import { scenarioIds } from "../planner/steps.ts"
import type { CallResult, DesktopDriver } from "./types.ts"

export type FixtureMeta = {
  synthetic: boolean
  version: string
  recordedAt: string
  envelopeVersion: string
}

type RecordedStep = {
  argv: string[]
  envelope: Envelope
  ms: number
  screenshot?: string
}

const DEMO_FLOOR_MS = 700

export class ReplayDriver implements DesktopDriver {
  readonly kind = "replay" as const
  private steps: RecordedStep[] = []
  private cursor = 0
  private scenario: ScenarioId | null = null
  private speed: number
  private readonly root: string

  constructor(options?: { fixturesRoot?: string; speed?: number }) {
    this.root = options?.fixturesRoot ?? path.join(appRoot, "fixtures")
    this.speed = options?.speed ?? 1
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  async prepare(scenario: ScenarioId): Promise<void> {
    this.scenario = scenario
    this.cursor = 0
    const file = path.join(this.root, scenario, "steps.jsonl")
    if (!existsSync(file)) {
      this.steps = []
      return
    }
    const lines = readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    this.steps = lines.map((line) => {
      const parsed = JSON.parse(line) as RecordedStep
      parsed.envelope = parseEnvelope(JSON.stringify(parsed.envelope))
      return parsed
    })
  }

  status(): Promise<CallResult> {
    return Promise.resolve(immediate(["status"], ok("status", { supported_surfaces: ["window"] })))
  }

  listApps(): Promise<CallResult> {
    const apps = new Map<string, Record<string, unknown>>()
    for (const scenario of scenarioIds) {
      const file = path.join(this.root, scenario, "apps.json")
      if (!existsSync(file)) continue
      const envelope = parseEnvelope(readFileSync(file, "utf8"))
      if (!envelope.ok || !envelope.data || typeof envelope.data !== "object") continue
      const rows = (envelope.data as { apps?: unknown }).apps
      if (!Array.isArray(rows)) continue
      for (const row of rows) {
        if (!row || typeof row !== "object") continue
        const name = (row as { name?: string }).name
        if (typeof name === "string") apps.set(name, row as Record<string, unknown>)
      }
    }
    return Promise.resolve(
      immediate(["list-apps"], ok("list-apps", { apps: [...apps.values()] })),
    )
  }

  sessionStart(name: string): Promise<CallResult> {
    return Promise.resolve(
      immediate(
        ["session", "start", "--name", name],
        ok("session", { session_id: `replay-${this.scenario ?? "idle"}`, name }),
      ),
    )
  }

  sessionEnd(sessionId: string): Promise<CallResult> {
    return Promise.resolve(
      immediate(["session", "end", sessionId, "--session", sessionId], ok("session", { session_id: sessionId })),
    )
  }

  launch(app: string, sessionId: string): Promise<CallResult> {
    return this.next("launch", ["launch", app], sessionId)
  }

  waitForWindow(app: string, title: string, timeoutMs: number, sessionId: string): Promise<CallResult> {
    return this.next(
      "wait",
      ["wait", "--window", title, "--app", app, "--timeout", String(timeoutMs)],
      sessionId,
    )
  }

  pause(ms: number, sessionId: string): Promise<CallResult> {
    return this.next("wait", ["wait", String(ms)], sessionId)
  }

  snapshot(app: string, sessionId: string): Promise<CallResult> {
    return this.next("snapshot", ["snapshot", "--app", app, "-i", "--compact"], sessionId)
  }

  click(ref: string, sessionId: string): Promise<CallResult> {
    return this.next("click", ["click", ref], sessionId)
  }

  typeText(ref: string, text: string, sessionId: string): Promise<CallResult> {
    return this.next("type", ["type", ref, text], sessionId)
  }

  getValue(ref: string, sessionId: string): Promise<CallResult> {
    return this.next("get", ["get", ref, "--property", "value"], sessionId)
  }

  screenshot(app: string, filePath: string, sessionId: string): Promise<CallResult> {
    return this.next("screenshot", ["screenshot", "--app", app, filePath], sessionId)
  }

  closeApp(app: string, sessionId: string | null): Promise<CallResult> {
    return Promise.resolve(immediate(["close-app", app], ok("close-app", { app }), sessionId))
  }

  traceShow(sessionId: string): Promise<CallResult> {
    return Promise.resolve(
      immediate(
        ["trace", "show", "--limit", "100"],
        {
          version: "2.5",
          ok: false,
          command: "trace",
          error: {
            code: "PLATFORM_NOT_SUPPORTED",
            message: "trace show is live only",
            disposition: { delivery: "not_delivered", retry: "unsafe" },
          },
        },
        sessionId,
      ),
    )
  }

  idleSnapshot(app: string): Promise<CallResult | null> {
    for (const scenario of scenarioIds) {
      const dir = path.join(this.root, scenario)
      if (!existsSync(dir)) continue
      const files = readdirSync(dir)
        .filter((name) => /^snapshot-\d+\.json$/.test(name))
        .sort()
      for (const name of files) {
        const envelope = parseEnvelope(readFileSync(path.join(dir, name), "utf8"))
        if (!envelope.ok || !envelope.data || typeof envelope.data !== "object") continue
        if ((envelope.data as { app?: string }).app === app) {
          return Promise.resolve(immediate(["snapshot", "--app", app, "-i", "--compact"], envelope))
        }
      }
    }
    return Promise.resolve(null)
  }

  idleScreenshot(app: string): string | null {
    for (const scenario of [...scenarioIds].reverse()) {
      const dir = path.join(this.root, scenario, "screens")
      if (!existsSync(dir)) continue
      const files = readdirSync(dir)
        .filter((name) => name.endsWith(".png"))
        .sort()
      const apps = readApps(path.join(this.root, scenario, "apps.json"))
      if (!apps.includes(app) || files.length === 0) continue
      const preferred = files.find((name) => name.startsWith(app)) ?? files[files.length - 1]
      if (!preferred) continue
      return path.join(dir, preferred)
    }
    return null
  }

  meta(scenario: ScenarioId): FixtureMeta | null {
    const file = path.join(this.root, scenario, "meta.json")
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, "utf8")) as FixtureMeta
  }

  synthetic(): boolean {
    return scenarioIds.some((scenario) => this.meta(scenario)?.synthetic === true)
  }

  recordedVersion(): string | null {
    for (const scenario of scenarioIds) {
      const version = this.meta(scenario)?.version
      if (version) return version
    }
    return null
  }

  private async next(command: string, commandArgv: string[], sessionId: string | null): Promise<CallResult> {
    const step = this.steps[this.cursor]
    if (!step || step.envelope.command !== command) {
      return immediate(commandArgv, liveRequired(command), sessionId)
    }
    this.cursor += 1
    const delay = Math.max(step.ms, DEMO_FLOOR_MS) / this.speed
    if (delay > 0) await Bun.sleep(delay)
    const envelope = rewriteScreenshot(step, this.root, this.scenario)
    return { envelope, argv: withSession(commandArgv, sessionId), ms: step.ms, stderr: "" }
  }
}

function rewriteScreenshot(step: RecordedStep, root: string, scenario: ScenarioId | null): Envelope {
  if (!step.screenshot || !scenario || !step.envelope.ok) return step.envelope
  const filePath = path.join(root, scenario, step.screenshot)
  const data = step.envelope.data
  if (!data || typeof data !== "object") return step.envelope
  return { ...step.envelope, data: { ...(data as Record<string, unknown>), path: filePath } }
}

function withSession(command: string[], sessionId: string | null): string[] {
  if (!sessionId) return command
  return [...command, "--session", sessionId]
}

function immediate(command: string[], envelope: Envelope, sessionId: string | null = null): CallResult {
  return { envelope, argv: withSession(command, sessionId), ms: 0, stderr: "" }
}

function ok(command: string, data: unknown): Envelope {
  return { version: "2.5", ok: true, command, data }
}

function readApps(file: string): string[] {
  if (!existsSync(file)) return []
  const envelope = parseEnvelope(readFileSync(file, "utf8"))
  if (!envelope.ok || !envelope.data || typeof envelope.data !== "object") return []
  const rows = (envelope.data as { apps?: unknown }).apps
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const name = (row as { name?: string }).name
    return typeof name === "string" ? [name] : []
  })
}

export { DEMO_FLOOR_MS }
