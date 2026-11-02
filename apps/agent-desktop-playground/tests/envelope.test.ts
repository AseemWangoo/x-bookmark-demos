import { describe, expect, test } from "bun:test"

import { envelopeSchema, isRetrySafe, parseEnvelope } from "../server/envelope.ts"
import { detectMode } from "../server/env.ts"

const readmeSnapshot = {
  version: "2.5",
  ok: true,
  command: "snapshot",
  data: {
    app: "Finder",
    window: { id: "w-204749", title: "Downloads" },
    snapshot_id: "s8f3k2p9",
    ref_count: 59,
    complete: true,
    tree: {
      role: "window",
      name: "Downloads",
      children: [
        { role: "treeitem", name: "Documents", ref_id: "@s8f3k2p9:e8", available_actions: ["Click"] },
      ],
    },
    unexpected_vendor_key: true,
  },
}

const staleRef = {
  version: "2.5",
  ok: false,
  command: "click",
  error: {
    code: "STALE_REF",
    message: "@s8f3k2p9:e7 not found in current RefMap",
    suggestion:
      "Re-run a snapshot to obtain fresh refs, then retry with the new ref (CLI: snapshot [--skeleton]; FFI: ad_snapshot then pass the printed qualified ref to ad_execute_by_ref)",
    recovery: {
      strategy: "refresh_snapshot_then_retry_original",
      retryable: true,
      requires_fresh_snapshot: true,
    },
    disposition: { delivery: "not_delivered", retry: "safe" },
  },
}

const deniedStatus = {
  version: "2.5",
  ok: true,
  command: "status",
  data: {
    permissions: { accessibility: { state: "denied" } },
    supported_surfaces: [],
    platform: "linux",
  },
}

const platformNotSupported = {
  version: "2.5",
  ok: false,
  command: "list-apps",
  error: {
    code: "PLATFORM_NOT_SUPPORTED",
    message: "The AT-SPI accessibility bus is not available in this session",
    disposition: { delivery: "not_delivered", retry: "unsafe" },
  },
}

const permDenied = {
  version: "2.5",
  ok: false,
  command: "snapshot",
  error: {
    code: "PERM_DENIED",
    message: "Accessibility permission not granted",
    disposition: { delivery: "not_delivered", retry: "unsafe" },
  },
}

const typeResult = {
  version: "2.5",
  ok: true,
  command: "type",
  data: {
    action: "type",
    disposition: { delivery: "delivered_verified", retry: "unsafe" },
    steps: [{ label: "EditableText.InsertText", mechanism: "semantic_api", outcome: "succeeded", verified: true }],
    post_state: { value: "To-do:\n- Plan\n- Build\n- Record demo" },
    extra: { ignored: true },
  },
}

describe("envelope", () => {
  test("parses the README snapshot, errors, and an action result, keeping unknown keys", () => {
    const snapshot = envelopeSchema.parse(readmeSnapshot)
    expect(snapshot.ok).toBe(true)
    if (!snapshot.ok) return
    expect(snapshot.data && typeof snapshot.data === "object" && "unexpected_vendor_key" in snapshot.data).toBe(true)

    const stale = parseEnvelope(JSON.stringify(staleRef))
    expect(stale.ok).toBe(false)
    if (stale.ok) return
    expect(stale.error.code).toBe("STALE_REF")
    expect(isRetrySafe(stale)).toBe(true)

    expect(isRetrySafe(envelopeSchema.parse(platformNotSupported))).toBe(false)
    expect(isRetrySafe(envelopeSchema.parse(permDenied))).toBe(false)
    const typed = envelopeSchema.parse(typeResult)
    expect(typed.ok).toBe(true)
    if (!typed.ok || !typed.data || typeof typed.data !== "object") return
    const steps = (typed.data as { steps?: { mechanism?: string }[] }).steps
    expect(steps?.[0]?.mechanism).toBe("semantic_api")
  })
})

describe("mode", () => {
  test("empty surfaces replay, a surface goes live, and MODE overrides", () => {
    const empty = detectMode({ mode: "auto", status: envelopeSchema.parse(deniedStatus), spawnError: null })
    expect(empty.mode).toBe("replay")
    expect(empty.reason).toContain("supported_surfaces")

    const missing = detectMode({ mode: "auto", status: envelopeSchema.parse(platformNotSupported), spawnError: null })
    expect(missing.mode).toBe("replay")
    expect(missing.reason).toContain("PLATFORM_NOT_SUPPORTED")

    const live = detectMode({
      mode: "auto",
      status: envelopeSchema.parse({
        ...deniedStatus,
        data: { ...deniedStatus.data, supported_surfaces: ["window"], permissions: { accessibility: { state: "granted" } } },
      }),
      spawnError: null,
    })
    expect(live).toEqual({ mode: "live", reason: null })
    expect(detectMode({ mode: "replay", status: envelopeSchema.parse(deniedStatus), spawnError: null }).mode).toBe("replay")
    expect(detectMode({ mode: "live", status: envelopeSchema.parse(deniedStatus), spawnError: null }).mode).toBe("live")
  })
})
