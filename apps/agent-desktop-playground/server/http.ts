import { existsSync, readFileSync } from "node:fs"

import { readPackagedVersion } from "./bin.ts"
import { ReplayDriver } from "./driver/replay.ts"
import { LiveDriver } from "./driver/live.ts"
import type { DesktopDriver } from "./driver/types.ts"
import { detectMode, readSettings, type ModeDecision, type Settings } from "./env.ts"
import { runPrompt, type StepLog } from "./runner.ts"

export type Runtime = {
  settings: Settings
  decision: ModeDecision
  driver: DesktopDriver
  replay: ReplayDriver
  version: string
  os: string
  screenshots: Map<string, string>
  lastSessionId: string | null
  running: boolean
}

const encoder = new TextEncoder()

export async function createRuntime(env: Record<string, string | undefined> = process.env): Promise<Runtime> {
  const settings = readSettings(env)
  const replay = new ReplayDriver({ speed: settings.replaySpeed })
  let driver: DesktopDriver = replay
  let decision: ModeDecision
  if (settings.mode === "replay") {
    decision = detectMode({ mode: "replay", status: null, spawnError: null })
  } else {
    const live = new LiveDriver(settings.bin ?? undefined)
    try {
      const status = await live.status()
      decision = detectMode({ mode: settings.mode, status: status.envelope, spawnError: null })
      if (decision.mode === "live") driver = live
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      decision = detectMode({ mode: settings.mode, status: null, spawnError: message })
      if (settings.mode === "live") driver = live
    }
  }
  return {
    settings,
    decision,
    driver,
    replay,
    version: replay.recordedVersion() ?? readPackagedVersion(),
    os: readOs(),
    screenshots: new Map(),
    lastSessionId: null,
    running: false,
  }
}

export async function handle(request: Request, runtime: Runtime): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname === "/api/mode" && request.method === "GET") return json(modePayload(runtime))
  if (url.pathname === "/api/apps" && request.method === "GET") return json((await runtime.driver.listApps()).envelope)
  if (url.pathname === "/api/snapshot" && request.method === "GET") return snapshot(url, runtime)
  if (url.pathname === "/api/screenshot" && request.method === "GET") return screenshot(url, runtime)
  if (url.pathname === "/api/trace" && request.method === "GET") return trace(runtime)
  if (url.pathname === "/api/run" && request.method === "POST") return run(request, runtime)
  return json({ ok: false, error: { message: "not found" } }, 404)
}

function modePayload(runtime: Runtime) {
  return {
    mode: runtime.decision.mode,
    reason: runtime.decision.reason,
    synthetic: runtime.driver.kind === "replay" ? runtime.replay.synthetic() : false,
    agentDesktopVersion: runtime.version,
    envelopeVersion: "2.5",
    os: runtime.os,
    planner: runtime.settings.planner,
  }
}

async function snapshot(url: URL, runtime: Runtime): Promise<Response> {
  const app = url.searchParams.get("app")
  if (!app) return json({ ok: false, error: { message: "app is required" } }, 400)
  if (runtime.driver.kind === "replay") {
    const idle = await runtime.driver.idleSnapshot(app)
    if (!idle) return json({ ok: false, error: { message: `no recorded snapshot for ${app}` } }, 404)
    return json(idle.envelope)
  }
  const result = await runtime.driver.snapshot(app, "")
  return json(result.envelope, result.envelope.ok ? 200 : 502)
}

function screenshot(url: URL, runtime: Runtime): Response {
  const app = url.searchParams.get("app")
  if (!app) return json({ ok: false, error: { message: "app is required" } }, 400)
  const file = runtime.screenshots.get(app) ?? runtime.driver.idleScreenshot(app)
  if (!file || !existsSync(file)) return json({ ok: false, error: { message: "no screenshot" } }, 404)
  return new Response(Bun.file(file), { headers: { "content-type": "image/png", "cache-control": "no-store" } })
}

async function trace(runtime: Runtime): Promise<Response> {
  if (runtime.driver.kind !== "live" || !runtime.lastSessionId) {
    return json(
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
      409,
    )
  }
  const result = await runtime.driver.traceShow(runtime.lastSessionId)
  return json(result.envelope, result.envelope.ok ? 200 : 502)
}

async function run(request: Request, runtime: Runtime): Promise<Response> {
  if (runtime.running) return json({ ok: false, error: { message: "a run is already in progress" } }, 409)
  const body = (await request.json().catch(() => null)) as { prompt?: unknown; speed?: unknown } | null
  const prompt = typeof body?.prompt === "string" ? body.prompt : ""
  if (!prompt.trim()) return json({ ok: false, error: { message: "prompt is required" } }, 400)
  const speed = typeof body?.speed === "number" && body.speed > 0 ? body.speed : null
  runtime.running = true
  const previous = runtime.settings.replaySpeed
  if (speed && runtime.driver.kind === "replay") runtime.replay.setSpeed(speed)
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      try {
        const result = await runPrompt({
          driver: runtime.driver,
          prompt,
          planner: runtime.settings.planner,
          onStep: (step) => {
            const published = publishScreenshot(step, runtime)
            send("step", published)
          },
        })
        runtime.lastSessionId = result.sessionId
        send("done", { ok: result.ok, scenario: result.scenario, sessionId: result.sessionId })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        send("error", { message })
      } finally {
        if (runtime.driver.kind === "replay") runtime.replay.setSpeed(previous)
        runtime.running = false
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  })
}

function publishScreenshot(step: StepLog, runtime: Runtime): StepLog {
  if (!step.screenshotUrl) return step
  const app = appFromArgv(step.argv)
  if (!app) return step
  runtime.screenshots.set(app, step.screenshotUrl)
  return { ...step, screenshotUrl: `/api/screenshot?app=${encodeURIComponent(app)}&t=${step.index}` }
}

function appFromArgv(argv: string[]): string | null {
  const index = argv.indexOf("--app")
  const app = index >= 0 ? argv[index + 1] : null
  return app ?? null
}

function readOs(): string {
  try {
    const text = readFileSync("/etc/os-release", "utf8")
    const match = /^PRETTY_NAME="(.*)"$/m.exec(text)
    if (match?.[1]) return match[1]
  } catch {
    // fall through
  }
  return `${process.platform} ${process.arch}`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  })
}
