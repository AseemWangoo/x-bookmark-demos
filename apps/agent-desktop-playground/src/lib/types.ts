export type ModeInfo = {
  mode: "live" | "replay"
  reason: string | null
  synthetic: boolean
  agentDesktopVersion: string
  envelopeVersion: string
  os: string
  planner: string
}

export type AppRow = {
  name: string
  pid?: number
  bundle_id?: string
  presentation?: string
}

export type A11yNode = {
  role?: string
  name?: string
  ref_id?: string
  value?: string
  available_actions?: string[]
  children?: A11yNode[]
}

export type SnapshotView = {
  app: string
  snapshotId: string
  refCount: number | null
  complete: boolean | null
  windowTitle: string | null
  tree: A11yNode
}

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
  envelope: unknown
  stderr: string
  suggestion: string | null
  retrySafe: boolean
  screenshotUrl: string | null
}

export type Envelope = {
  version?: string
  ok: boolean
  command?: string
  data?: unknown
  error?: { code?: string; message?: string; suggestion?: string }
}
