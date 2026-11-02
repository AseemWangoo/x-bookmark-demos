import type { Envelope, ModeInfo, SnapshotView, StepLog } from "./types"

export async function fetchMode(): Promise<ModeInfo> {
  const response = await fetch("/api/mode")
  if (!response.ok) throw new Error(`mode ${response.status}`)
  return (await response.json()) as ModeInfo
}

export async function fetchEnvelope(path: string): Promise<Envelope> {
  const response = await fetch(path)
  const body = (await response.json()) as Envelope
  return body
}

export async function runTask(
  prompt: string,
  onStep: (step: StepLog) => void,
  speed?: number,
): Promise<{ ok: boolean }> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, ...(speed ? { speed } : {}) }),
  })
  if (!response.ok || !response.body) {
    const text = await response.text()
    throw new Error(text || `run ${response.status}`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let ok = false
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    buffer += decoder.decode(chunk.value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""
    for (const part of parts) {
      const event = /^event: (.+)$/m.exec(part)?.[1] ?? "message"
      const data = part
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n")
      const parsed = data ? (JSON.parse(data) as unknown) : null
      if (event === "step") onStep(parsed as StepLog)
      if (event === "error") {
        const message = parsed && typeof parsed === "object" && "message" in parsed ? String(parsed.message) : "run failed"
        throw new Error(message)
      }
      if (event === "done" && parsed && typeof parsed === "object" && "ok" in parsed) {
        ok = Boolean(parsed.ok)
      }
    }
  }
  return { ok }
}

export function snapshotFromEnvelope(envelope: Envelope): SnapshotView | null {
  if (!envelope.ok || !envelope.data || typeof envelope.data !== "object") return null
  const data = envelope.data as {
    app?: string
    snapshot_id?: string
    ref_count?: number
    complete?: boolean
    window?: { title?: string }
    tree?: SnapshotView["tree"]
  }
  if (!data.tree || typeof data.snapshot_id !== "string" || typeof data.app !== "string") return null
  return {
    app: data.app,
    snapshotId: data.snapshot_id,
    refCount: typeof data.ref_count === "number" ? data.ref_count : null,
    complete: typeof data.complete === "boolean" ? data.complete : null,
    windowTitle: data.window?.title ?? null,
    tree: data.tree,
  }
}
