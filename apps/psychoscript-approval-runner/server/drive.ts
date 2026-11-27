import { type Snapshot, fromBytes, toBytes } from "psychoscript"

import type { Decision, DiagnosticView, PendingCall, ResultView, TimelineEvent } from "../shared/types.ts"
import type { Env } from "./env.ts"
import { RunError } from "./errors.ts"
import { makeRuntime } from "./runtime.ts"
import type { ToolHooks } from "./tools.ts"

type Program = ReturnType<ReturnType<typeof makeRuntime>["program"]>
type Outcome = Awaited<ReturnType<Program["run"]>>

export type DriveHit =
  | { status: "suspended"; bytes: Uint8Array; pending: PendingCall }
  | { status: "finished"; result: ResultView }

export async function driveProgram(
  env: Env,
  input: { kind: "program"; code: string } | { kind: "resume"; bytes: Uint8Array },
  decisions: Readonly<Record<string, Decision>>,
  push: (event: TimelineEvent) => void,
): Promise<DriveHit> {
  let pending: PendingCall | null = null
  let resolvePending: (call: PendingCall) => void = () => {}
  const pendingGate = new Promise<PendingCall>((resolve) => {
    resolvePending = resolve
  })

  const hooks: ToolHooks = {
    onTool: (name, args, result) => {
      push({ type: "tool", at: now(), name, args, result })
    },
    onPending: (call) => {
      if (pending) return
      pending = call
      resolvePending(call)
    },
    decisionFor: (key) => decisions[key],
  }

  const runtime = makeRuntime(env, hooks)
  const program = input.kind === "program" ? runtime.program(input.code) : resumeFromBytes(runtime, input.bytes)
  const controller = new AbortController()
  const running = program.run({ signal: controller.signal })

  try {
    const first = await Promise.race([
      running.then(
        (outcome) => ({ tag: "end" as const, outcome }),
        (error: unknown) => {
          throw error
        },
      ),
      pendingGate.then((call) => ({ tag: "pending" as const, call })),
    ])

    if (first.tag === "end") {
      return { status: "finished", result: resultOf(first.outcome) }
    }

    // The host call has to be in flight before suspend. Same pause the package README uses.
    await new Promise((resolve) => setTimeout(resolve, 20))
    const outcome = await program.suspend()
    await running
    if (outcome.ok !== "suspended") {
      return { status: "finished", result: resultOf(outcome) }
    }
    if (!pending) throw new RunError(500, "Suspended without a pending call.")
    const bytes = toBytes(outcome.state)
    return { status: "suspended", bytes, pending }
  } catch (error) {
    controller.abort()
    await running.catch(() => {})
    throw error
  }
}

function resumeFromBytes(runtime: ReturnType<typeof makeRuntime>, bytes: Uint8Array) {
  const decoded: unknown = fromBytes(bytes)
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Snapshot bytes did not decode to an object.")
  }
  return runtime.resume(decoded as Snapshot)
}

function resultOf(outcome: Outcome): ResultView {
  if (outcome.ok === "suspended") throw new RunError(500, "Expected a finished result.")
  if (outcome.ok === true) return { ok: true, value: outcome.value }
  if (outcome.ok === false) {
    const error: DiagnosticView = {
      kind: outcome.error.kind,
      message: outcome.error.message,
      ...(outcome.error.suggestions ? { suggestions: [...outcome.error.suggestions] } : {}),
    }
    return { ok: false, error }
  }
  const unreachable: never = outcome
  return unreachable
}

function now(): string {
  return new Date().toISOString()
}
