import { mkdirSync } from "node:fs"
import path from "node:path"

import { appRoot } from "./bin.ts"
import {
  deliveryOf,
  isRetrySafe,
  mechanismOf,
  snapshotIdOf,
  suggestionOf,
  type Envelope,
} from "./envelope.ts"
import type { CallResult, DesktopDriver } from "./driver/types.ts"
import { planWithLlm } from "./planner/llm.ts"
import { findRef, treeFromEnvelope, type MissingRef } from "./planner/refs.ts"
import { planScripted } from "./planner/scripted.ts"
import type { AbstractStep, Plan, RefQuery, ScenarioId } from "./planner/steps.ts"
import type { PlannerSetting } from "./env.ts"

export type StepLog = {
  index: number
  intent: string
  argv: string[]
  refs: string[]
  snapshotId: string | null
  ok: boolean
  code: string | null
  delivery: string | null
  mechanism: string | null
  ms: number
  envelope: Envelope
  stderr: string
  suggestion: string | null
  retrySafe: boolean
  screenshotUrl: string | null
}

export type RunOptions = {
  driver: DesktopDriver
  prompt: string
  planner: PlannerSetting
  onStep: (step: StepLog) => void | Promise<void>
  screenshotDir?: string
  signal?: AbortSignal
}

type SnapshotCache = {
  snapshotId: string
  tree: NonNullable<ReturnType<typeof treeFromEnvelope>>["tree"]
  app: string
}

export async function runPrompt(options: RunOptions): Promise<{ ok: boolean; scenario: ScenarioId | null; sessionId: string | null }> {
  const plan = options.planner === "llm" ? planWithLlm() : planScripted(options.prompt)
  if (!plan.ok) {
    await options.onStep(messageStep(0, plan.message))
    return { ok: false, scenario: null, sessionId: null }
  }
  await options.driver.prepare(plan.scenario)
  const started = await options.driver.sessionStart(`playground-${Date.now()}`)
  const sessionId = sessionIdFrom(started.envelope)
  if (!sessionId) {
    await options.onStep(fromCall(0, "Start an agent-desktop session", started, []))
    return { ok: false, scenario: plan.scenario, sessionId: null }
  }
  let index = 0
  let ok = true
  let cache: SnapshotCache | null = null
  const shotDir = options.screenshotDir ?? path.join(appRoot, ".run", String(Date.now()))
  try {
    for (const step of plan.steps) {
      if (options.signal?.aborted) break
      const emitted = await executeStep(step, {
        driver: options.driver,
        sessionId,
        cache,
        index,
        shotDir,
        onStep: options.onStep,
      })
      index = emitted.index
      cache = emitted.cache
      if (!emitted.ok) {
        ok = false
        break
      }
    }
  } finally {
    await options.driver.sessionEnd(sessionId).catch(() => undefined)
  }
  return { ok, scenario: plan.scenario, sessionId }
}

async function executeStep(
  step: AbstractStep,
  ctx: {
    driver: DesktopDriver
    sessionId: string
    cache: SnapshotCache | null
    index: number
    shotDir: string
    onStep: RunOptions["onStep"]
  },
): Promise<{ ok: boolean; index: number; cache: SnapshotCache | null }> {
  switch (step.op) {
    case "launch": {
      const result = await ctx.driver.launch(step.app, ctx.sessionId)
      await ctx.onStep(fromCall(ctx.index, step.intent, result, []))
      return { ok: result.envelope.ok, index: ctx.index + 1, cache: ctx.cache }
    }
    case "wait": {
      const result = await ctx.driver.waitForWindow(step.app, step.window, step.timeoutMs, ctx.sessionId)
      await ctx.onStep(fromCall(ctx.index, step.intent, result, []))
      return { ok: result.envelope.ok, index: ctx.index + 1, cache: ctx.cache }
    }
    case "pause": {
      const result = await ctx.driver.pause(step.ms, ctx.sessionId)
      await ctx.onStep(fromCall(ctx.index, step.intent, result, []))
      return { ok: result.envelope.ok, index: ctx.index + 1, cache: ctx.cache }
    }
    case "snapshot": {
      const result = await ctx.driver.snapshot(step.app, ctx.sessionId)
      const next = cacheFrom(result.envelope, step.app) ?? ctx.cache
      await ctx.onStep(fromCall(ctx.index, step.intent, result, []))
      return { ok: result.envelope.ok, index: ctx.index + 1, cache: next }
    }
    case "screenshot": {
      mkdirSync(ctx.shotDir, { recursive: true })
      const filePath = path.join(ctx.shotDir, `${ctx.index}-${step.app}.png`)
      const result = await ctx.driver.screenshot(step.app, filePath, ctx.sessionId)
      const log = fromCall(ctx.index, step.intent, result, [])
      if (result.envelope.ok) {
        const data = result.envelope.data
        const saved = data && typeof data === "object" && typeof (data as { path?: unknown }).path === "string"
          ? (data as { path: string }).path
          : filePath
        log.screenshotUrl = saved
      }
      await ctx.onStep(log)
      return { ok: result.envelope.ok, index: ctx.index + 1, cache: ctx.cache }
    }
    case "click":
    case "type":
    case "verify":
      return actOnRef(step, ctx)
    default: {
      const neverStep: never = step
      return neverStep
    }
  }
}

async function actOnRef(
  step: Extract<AbstractStep, { op: "click" | "type" | "verify" }>,
  ctx: {
    driver: DesktopDriver
    sessionId: string
    cache: SnapshotCache | null
    index: number
    shotDir: string
    onStep: RunOptions["onStep"]
  },
): Promise<{ ok: boolean; index: number; cache: SnapshotCache | null }> {
  let cache = ctx.cache
  let index = ctx.index
  if (!cache || cache.app !== step.app) {
    const snap = await ctx.driver.snapshot(step.app, ctx.sessionId)
    cache = cacheFrom(snap.envelope, step.app) ?? cache
    await ctx.onStep(fromCall(index, `Snapshot ${step.app} before acting`, snap, []))
    index += 1
    if (!snap.envelope.ok || !cache) return { ok: false, index, cache }
  }
  const resolved = findRef(cache.tree, cache.snapshotId, step.query)
  if (!resolved.ok) {
    await ctx.onStep(missingStep(index, step.intent, resolved, cache.snapshotId))
    return { ok: false, index: index + 1, cache }
  }
  const first = await dispatch(step, resolved.ref, ctx.driver, ctx.sessionId)
  let result = first
  let ref = resolved.ref
  let snapshotId = cache.snapshotId
  if (!result.envelope.ok && result.envelope.error.code === "STALE_REF" && isRetrySafe(result.envelope)) {
    await ctx.onStep(fromCall(index, step.intent, result, [ref], snapshotId))
    index += 1
    const snap = await ctx.driver.snapshot(step.app, ctx.sessionId)
    cache = cacheFrom(snap.envelope, step.app) ?? cache
    await ctx.onStep(fromCall(index, "Re-snapshot after STALE_REF", snap, []))
    index += 1
    if (!snap.envelope.ok || !cache) return { ok: false, index, cache }
    const again = findRef(cache.tree, cache.snapshotId, step.query)
    if (!again.ok) {
      await ctx.onStep(missingStep(index, step.intent, again, cache.snapshotId))
      return { ok: false, index: index + 1, cache }
    }
    ref = again.ref
    snapshotId = cache.snapshotId
    result = await dispatch(step, ref, ctx.driver, ctx.sessionId)
  }
  const log = fromCall(index, step.intent, result, [ref], snapshotId)
  if (step.op === "verify") {
    const value = readValue(result.envelope)
    const matched = value !== null && value.includes(step.contains)
    log.ok = result.envelope.ok && matched
    log.delivery = matched ? "delivered_verified" : "not_delivered"
    log.code = matched ? null : result.envelope.ok ? "ACTION_FAILED" : log.code
    if (!matched && result.envelope.ok) {
      log.suggestion = `get value ${JSON.stringify(value)} does not contain ${JSON.stringify(step.contains)}`
    }
  }
  await ctx.onStep(log)
  return { ok: log.ok, index: index + 1, cache }
}

async function dispatch(
  step: Extract<AbstractStep, { op: "click" | "type" | "verify" }>,
  ref: string,
  driver: DesktopDriver,
  sessionId: string,
): Promise<CallResult> {
  switch (step.op) {
    case "click":
      return driver.click(ref, sessionId)
    case "type":
      return driver.typeText(ref, step.text, sessionId)
    case "verify":
      return driver.getValue(ref, sessionId)
    default: {
      const neverOp: never = step
      return neverOp
    }
  }
}

function cacheFrom(envelope: Envelope, app: string): SnapshotCache | null {
  if (!envelope.ok) return null
  const parsed = treeFromEnvelope(envelope.data)
  if (!parsed) return null
  return { snapshotId: parsed.snapshotId, tree: parsed.tree, app }
}

function sessionIdFrom(envelope: Envelope): string | null {
  if (!envelope.ok || !envelope.data || typeof envelope.data !== "object") return null
  const id = (envelope.data as { session_id?: unknown }).session_id
  return typeof id === "string" ? id : null
}

function readValue(envelope: Envelope): string | null {
  if (!envelope.ok || !envelope.data || typeof envelope.data !== "object") return null
  const value = (envelope.data as { value?: unknown }).value
  return typeof value === "string" ? value : null
}

export function fromCall(
  index: number,
  intent: string,
  result: CallResult,
  refs: string[],
  snapshotId: string | null = snapshotIdOf(result.envelope),
): StepLog {
  const envelope = result.envelope
  return {
    index,
    intent,
    argv: result.argv,
    refs,
    snapshotId,
    ok: envelope.ok,
    code: envelope.ok ? null : envelope.error.code,
    delivery: deliveryOf(envelope),
    mechanism: mechanismOf(envelope),
    ms: result.ms,
    envelope,
    stderr: result.stderr,
    suggestion: suggestionOf(envelope),
    retrySafe: isRetrySafe(envelope),
    screenshotUrl: null,
  }
}

function missingStep(index: number, intent: string, missing: MissingRef, snapshotId: string): StepLog {
  const envelope: Envelope = {
    version: "2.5",
    ok: false,
    command: "find",
    error: {
      code: missing.code,
      message: missing.message,
      disposition: { delivery: "not_delivered", retry: "unsafe" },
    },
  }
  return {
    index,
    intent,
    argv: [],
    refs: [],
    snapshotId,
    ok: false,
    code: missing.code,
    delivery: "not_delivered",
    mechanism: null,
    ms: 0,
    envelope,
    stderr: "",
    suggestion: missing.message,
    retrySafe: false,
    screenshotUrl: null,
  }
}

function messageStep(index: number, message: string): StepLog {
  return missingStep(index, "Plan the prompt", { ok: false, code: "not_found", message }, "")
}

export function assertRefsBelongToSnapshot(step: StepLog, snapshots: Map<string, Envelope>): boolean {
  if (!step.snapshotId || step.refs.length === 0) return step.refs.length === 0
  const snapshot = snapshots.get(step.snapshotId)
  if (!snapshot) return false
  const refs = new Set<string>()
  collect(snapshot, refs)
  return step.refs.every((ref) => refs.has(ref) && !/^@e\d+$/.test(ref))
}

function collect(value: unknown, refs: Set<string>): void {
  if (typeof value === "string") {
    if (/^@[A-Za-z0-9]+:e\d+$/.test(value)) refs.add(value)
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) collect(entry, refs)
    return
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collect(entry, refs)
  }
}

export type { Plan, RefQuery }
