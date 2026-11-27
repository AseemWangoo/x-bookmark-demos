export const PSYCHOSCRIPT_VERSION = "0.2.1" as const

export type ToolName = "searchDocs" | "sendEmail" | "chargeCard"

export type RiskyToolName = "sendEmail" | "chargeCard"

export type Decision = "approve" | "reject"

export type PendingCall = {
  key: string
  name: RiskyToolName
  args: unknown[]
}

export type DiagnosticView = {
  kind: string
  message: string
  suggestions?: string[]
}

export type ResultView =
  | { ok: true; value: unknown }
  | { ok: false; error: DiagnosticView }

export type TimelineEvent =
  | { type: "started"; at: string }
  | { type: "tool"; at: string; name: ToolName; args: unknown[]; result: unknown }
  | { type: "paused"; at: string; name: RiskyToolName; key: string; snapshotBytes: number }
  | { type: "resumed"; at: string; name: RiskyToolName; key: string; decision: Decision }
  | { type: "finished"; at: string; ok: true; value: unknown }
  | { type: "finished"; at: string; ok: false; error: DiagnosticView }

export type RunStatus = "suspended" | "finished"

export type RunView = {
  id: string
  status: RunStatus
  code: string
  pending: PendingCall | null
  snapshotBytes: number | null
  timeline: TimelineEvent[]
  result: ResultView | null
  psychoscript: typeof PSYCHOSCRIPT_VERSION
}

export type MetaView = {
  psychoscript: typeof PSYCHOSCRIPT_VERSION
  bun: string
  demo: boolean
  license: "MIT"
  tools: readonly ToolName[]
}

export type RunRecord = {
  id: string
  code: string
  status: RunStatus
  pending: PendingCall | null
  snapshotBytes: number | null
  decisions: Record<string, Decision>
  timeline: TimelineEvent[]
  result: ResultView | null
}
