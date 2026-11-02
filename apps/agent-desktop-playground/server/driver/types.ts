import type { Envelope } from "../envelope.ts"
import type { ScenarioId } from "../planner/steps.ts"

export type CallResult = {
  envelope: Envelope
  argv: string[]
  ms: number
  stderr: string
}

export interface DesktopDriver {
  readonly kind: "live" | "replay"
  prepare(scenario: ScenarioId): Promise<void>
  status(): Promise<CallResult>
  listApps(): Promise<CallResult>
  sessionStart(name: string): Promise<CallResult>
  sessionEnd(sessionId: string): Promise<CallResult>
  launch(app: string, sessionId: string): Promise<CallResult>
  waitForWindow(app: string, title: string, timeoutMs: number, sessionId: string): Promise<CallResult>
  pause(ms: number, sessionId: string): Promise<CallResult>
  snapshot(app: string, sessionId: string): Promise<CallResult>
  click(ref: string, sessionId: string): Promise<CallResult>
  typeText(ref: string, text: string, sessionId: string): Promise<CallResult>
  getValue(ref: string, sessionId: string): Promise<CallResult>
  screenshot(app: string, filePath: string, sessionId: string): Promise<CallResult>
  closeApp(app: string, sessionId: string | null): Promise<CallResult>
  traceShow(sessionId: string): Promise<CallResult>
  idleSnapshot(app: string): Promise<CallResult | null>
  idleScreenshot(app: string): string | null
}
