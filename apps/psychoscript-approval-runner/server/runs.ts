import { parseProgram } from "psychoscript"

import {
  PSYCHOSCRIPT_VERSION,
  type Decision,
  type RunRecord,
  type RunView,
  type TimelineEvent,
} from "../shared/types.ts"
import { driveProgram, type DriveHit } from "./drive.ts"
import type { Env } from "./env.ts"
import { RunError } from "./errors.ts"
import { loadRun, saveRun } from "./store.ts"

const tails = new Map<string, Promise<unknown>>()

export async function startRun(env: Env, code: string): Promise<RunView> {
  const parsed = parseProgram(code)
  if (!parsed.ok) throw new RunError(400, parsed.error.message)
  const id = crypto.randomUUID()
  const timeline: TimelineEvent[] = [{ type: "started", at: stamp() }]
  const hit = await driveProgram(env, { kind: "program", code }, {}, (event) => {
    timeline.push(event)
  })
  const record = applyHit(id, code, timeline, {}, hit)
  await saveRun(env, record, hit.status === "suspended" ? hit.bytes : null)
  return toView(record)
}

export async function getRun(env: Env, id: string): Promise<RunView> {
  const loaded = await loadRun(env, id)
  return toView(loaded.record)
}

export async function decideRun(env: Env, id: string, decision: Decision): Promise<RunView> {
  return enqueue(id, async () => {
    const loaded = await loadRun(env, id)
    if (loaded.record.status !== "suspended" || !loaded.record.pending || !loaded.bytes) {
      throw new RunError(409, "This run is not waiting for a decision.")
    }
    const pending = loaded.record.pending
    const timeline: TimelineEvent[] = [
      ...loaded.record.timeline,
      { type: "resumed", at: stamp(), name: pending.name, key: pending.key, decision },
    ]
    const decisions = { ...loaded.record.decisions, [pending.key]: decision }
    const hit = await driveProgram(env, { kind: "resume", bytes: loaded.bytes }, decisions, (event) => {
      timeline.push(event)
    })
    const record = applyHit(loaded.record.id, loaded.record.code, timeline, decisions, hit)
    await saveRun(env, record, hit.status === "suspended" ? hit.bytes : null)
    return toView(record)
  })
}

function applyHit(
  id: string,
  code: string,
  timeline: TimelineEvent[],
  decisions: RunRecord["decisions"],
  hit: DriveHit,
): RunRecord {
  if (hit.status === "suspended") {
    timeline.push({
      type: "paused",
      at: stamp(),
      name: hit.pending.name,
      key: hit.pending.key,
      snapshotBytes: hit.bytes.byteLength,
    })
    return {
      id,
      code,
      status: "suspended",
      pending: hit.pending,
      snapshotBytes: hit.bytes.byteLength,
      decisions,
      timeline,
      result: null,
    }
  }
  if (hit.result.ok) {
    timeline.push({ type: "finished", at: stamp(), ok: true, value: hit.result.value })
  } else {
    timeline.push({ type: "finished", at: stamp(), ok: false, error: hit.result.error })
  }
  return {
    id,
    code,
    status: "finished",
    pending: null,
    snapshotBytes: null,
    decisions,
    timeline,
    result: hit.result,
  }
}

function toView(record: RunRecord): RunView {
  return {
    id: record.id,
    status: record.status,
    code: record.code,
    pending: record.pending,
    snapshotBytes: record.snapshotBytes,
    timeline: record.timeline,
    result: record.result,
    psychoscript: PSYCHOSCRIPT_VERSION,
  }
}

function enqueue<T>(id: string, job: () => Promise<T>): Promise<T> {
  const prev = tails.get(id) ?? Promise.resolve()
  const run = prev.then(job, job)
  tails.set(
    id,
    run.then(
      () => undefined,
      () => undefined,
    ),
  )
  return run
}

function stamp(): string {
  return new Date().toISOString()
}
