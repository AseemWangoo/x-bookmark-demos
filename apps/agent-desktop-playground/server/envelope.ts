import { z } from "zod"

const deliverySchema = z.enum([
  "unknown",
  "not_delivered",
  "delivery_uncertain",
  "delivered_unverified",
  "delivered_verified",
])

const retrySchema = z.enum(["unknown", "safe", "unsafe"])

export const dispositionSchema = z.looseObject({
  delivery: deliverySchema,
  retry: retrySchema,
})

export const errorSchema = z.looseObject({
  code: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
  details: z.unknown().optional(),
  recovery: z.unknown().optional(),
  platform_detail: z.unknown().optional(),
  disposition: dispositionSchema,
})

export const okEnvelopeSchema = z.looseObject({
  version: z.string(),
  ok: z.literal(true),
  command: z.string(),
  data: z.unknown().optional(),
})

export const errEnvelopeSchema = z.looseObject({
  version: z.string(),
  ok: z.literal(false),
  command: z.string(),
  error: errorSchema,
})

export const envelopeSchema = z.discriminatedUnion("ok", [
  okEnvelopeSchema,
  errEnvelopeSchema,
])

export type Envelope = z.infer<typeof envelopeSchema>
export type Disposition = z.infer<typeof dispositionSchema>

const qualifiedRef = /@[A-Za-z0-9]+:e\d+/g

export function parseEnvelope(stdout: string): Envelope {
  const trimmed = stdout.trim()
  const candidate = extractJson(trimmed)
  let raw: unknown
  try {
    raw = JSON.parse(candidate)
  } catch {
    throw new Error(`agent-desktop stdout was not JSON: ${trimmed.slice(0, 240)}`)
  }
  return envelopeSchema.parse(raw)
}

function extractJson(stdout: string): string {
  if (stdout.startsWith("{")) return stdout
  const start = stdout.lastIndexOf("\n{")
  if (start >= 0) return stdout.slice(start + 1)
  const brace = stdout.indexOf("{")
  return brace >= 0 ? stdout.slice(brace) : stdout
}

export function isRetrySafe(envelope: Envelope): boolean {
  if (envelope.ok) return false
  return envelope.error.disposition.retry === "safe"
}

export function deliveryOf(envelope: Envelope): string | null {
  if (envelope.ok) {
    const data = asRecord(envelope.data)
    const disposition = asRecord(data?.disposition)
    const delivery = disposition?.delivery
    return typeof delivery === "string" ? delivery : null
  }
  return envelope.error.disposition.delivery
}

export function mechanismOf(envelope: Envelope): string | null {
  if (!envelope.ok) return null
  const data = asRecord(envelope.data)
  const steps = data?.steps
  if (!Array.isArray(steps) || steps.length === 0) return null
  const first = asRecord(steps[0])
  const mechanism = first?.mechanism
  return typeof mechanism === "string" ? mechanism : null
}

export function suggestionOf(envelope: Envelope): string | null {
  if (envelope.ok) return null
  return envelope.error.suggestion ?? null
}

export function snapshotIdOf(envelope: Envelope): string | null {
  if (!envelope.ok) return null
  const data = asRecord(envelope.data)
  const id = data?.snapshot_id
  return typeof id === "string" ? id : null
}

export function refsIn(value: unknown): string[] {
  const found = new Set<string>()
  collectRefs(value, found)
  return [...found]
}

function collectRefs(value: unknown, found: Set<string>): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(qualifiedRef)) found.add(match[0])
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectRefs(entry, found)
    return
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectRefs(entry, found)
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function supportedSurfaces(envelope: Envelope): string[] {
  if (!envelope.ok) return []
  const data = asRecord(envelope.data)
  const surfaces = data?.supported_surfaces
  if (!Array.isArray(surfaces)) return []
  return surfaces.filter((entry): entry is string => typeof entry === "string")
}

export function syntheticTimeout(command: string, timeoutMs: number): Envelope {
  return {
    version: "2.5",
    ok: false,
    command,
    error: {
      code: "TIMEOUT",
      message: `agent-desktop exceeded ${timeoutMs}ms`,
      disposition: { delivery: "unknown", retry: "unsafe" },
    },
  }
}

export function liveRequired(command: string): Envelope {
  return {
    version: "2.5",
    ok: false,
    command,
    error: {
      code: "PLATFORM_NOT_SUPPORTED",
      message: "live desktop required",
      suggestion:
        "Start the API inside the desktop session: bun run desktop -- bun run dev:api",
      disposition: { delivery: "not_delivered", retry: "unsafe" },
    },
  }
}
