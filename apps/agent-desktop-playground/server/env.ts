import type { Envelope } from "./envelope.ts"
import { supportedSurfaces } from "./envelope.ts"

export type ModeSetting = "auto" | "live" | "replay"
export type PlannerSetting = "scripted" | "llm"
export type ResolvedMode = "live" | "replay"

export type Settings = {
  mode: ModeSetting
  planner: PlannerSetting
  port: number
  replaySpeed: number
  bin: string | null
}

export type ModeDecision = {
  mode: ResolvedMode
  reason: string | null
}

export function readSettings(env: Record<string, string | undefined> = process.env): Settings {
  return {
    mode: readMode(env.MODE),
    planner: readPlanner(env.PLANNER),
    port: readPort(env.PORT),
    replaySpeed: readSpeed(env.REPLAY_SPEED),
    bin: env.AGENT_DESKTOP_BIN ?? null,
  }
}

export function detectMode(input: {
  mode: ModeSetting
  status: Envelope | null
  spawnError: string | null
}): ModeDecision {
  if (input.mode === "live") return { mode: "live", reason: null }
  if (input.mode === "replay") return { mode: "replay", reason: "MODE=replay" }
  if (input.spawnError) return { mode: "replay", reason: input.spawnError }
  if (!input.status) return { mode: "replay", reason: "status unavailable" }
  if (!input.status.ok) {
    return {
      mode: "replay",
      reason: `${input.status.error.code}: ${input.status.error.message}`,
    }
  }
  const surfaces = supportedSurfaces(input.status)
  if (surfaces.length > 0) return { mode: "live", reason: null }
  const permissions = accessibilityState(input.status)
  const why = permissions ? `accessibility ${permissions}` : "accessibility bus did not answer"
  return { mode: "replay", reason: `supported_surfaces is empty (${why})` }
}

function accessibilityState(status: Envelope): string | null {
  if (!status.ok || !status.data || typeof status.data !== "object") return null
  const data = status.data as {
    permissions?: { accessibility?: { state?: string } }
  }
  const state = data.permissions?.accessibility?.state
  return typeof state === "string" ? state : null
}

function readMode(value: string | undefined): ModeSetting {
  if (value === undefined || value === "" || value === "auto") return "auto"
  if (value === "live" || value === "replay") return value
  throw new Error(`MODE must be auto, live, or replay (got ${value})`)
}

function readPlanner(value: string | undefined): PlannerSetting {
  if (value === undefined || value === "" || value === "scripted") return "scripted"
  if (value === "llm") return "llm"
  throw new Error(`PLANNER must be scripted or llm (got ${value})`)
}

function readPort(value: string | undefined): number {
  if (value === undefined || value === "") return 8787
  const port = Number(value)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`PORT is not an integer: ${value}`)
  return port
}

function readSpeed(value: string | undefined): number {
  if (value === undefined || value === "") return 1
  const speed = Number(value)
  if (!Number.isFinite(speed) || speed <= 0) throw new Error(`REPLAY_SPEED must be > 0 (got ${value})`)
  return speed
}
