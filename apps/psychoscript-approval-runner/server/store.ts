import { mkdir, rename, rm } from "node:fs/promises"
import { join } from "node:path"

import type { RunRecord } from "../shared/types.ts"
import type { Env } from "./env.ts"
import { RunError } from "./errors.ts"

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function assertRunId(id: string): string {
  if (!ID.test(id)) throw new RunError(400, "Invalid run id.")
  return id
}

export async function saveRun(env: Env, record: RunRecord, bytes: Uint8Array | null): Promise<void> {
  assertRunId(record.id)
  await mkdir(env.dataDir, { recursive: true })
  await writeAtomic(jsonPath(env, record.id), JSON.stringify(record))
  if (bytes) {
    await writeAtomic(binPath(env, record.id), bytes)
    return
  }
  await rm(binPath(env, record.id), { force: true })
}

export async function loadRun(env: Env, id: string): Promise<{ record: RunRecord; bytes: Uint8Array | null }> {
  assertRunId(id)
  const file = Bun.file(jsonPath(env, id))
  if (!(await file.exists())) throw new RunError(404, "Run not found.")
  const parsed: unknown = await file.json()
  const record = asRecord(parsed)
  if (record.status !== "suspended") return { record, bytes: null }
  const bin = Bun.file(binPath(env, id))
  if (!(await bin.exists())) throw new RunError(500, "Snapshot file is missing.")
  const bytes = new Uint8Array(await bin.arrayBuffer())
  return { record: { ...record, snapshotBytes: bytes.byteLength }, bytes }
}

function jsonPath(env: Env, id: string): string {
  return join(env.dataDir, `${id}.json`)
}

function binPath(env: Env, id: string): string {
  return join(env.dataDir, `${id}.bin`)
}

async function writeAtomic(path: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${path}.${crypto.randomUUID()}.tmp`
  await Bun.write(tmp, data)
  await rename(tmp, path)
}

function asRecord(value: unknown): RunRecord {
  if (value === null || typeof value !== "object") throw new RunError(500, "Run file is not an object.")
  return value as RunRecord
}
