import { Host } from "psychoscript"

import type { Decision, PendingCall, RiskyToolName, ToolName } from "../shared/types.ts"

export type ToolHooks = {
  onTool: (name: ToolName, args: unknown[], result: unknown) => void
  onPending: (call: PendingCall) => void
  decisionFor: (key: string) => Decision | undefined
}

export function makeGlobals(hooks: ToolHooks): {
  searchDocs: ReturnType<typeof Host.fn>
  sendEmail: ReturnType<typeof Host.fn>
  chargeCard: ReturnType<typeof Host.fn>
} {
  return {
    searchDocs: Host.fn(([query]) => {
      const result = { hits: [`doc for ${typeof query === "string" && query.length > 0 ? query : "query"}`] }
      hooks.onTool("searchDocs", jsonCloneArgs([query]), result)
      return result
    }),
    sendEmail: risky("sendEmail", hooks, (args) => {
      const body = recordOf(args[0])
      return {
        sent: true,
        to: stringField(body, "to"),
        subject: stringField(body, "subject"),
        id: "msg_fixture",
      }
    }),
    chargeCard: risky("chargeCard", hooks, (args) => {
      const body = recordOf(args[0])
      return {
        charged: true,
        amountCents: numberField(body, "amountCents"),
        currency: stringField(body, "currency"),
        id: "ch_fixture",
      }
    }),
  }
}

function risky(
  name: RiskyToolName,
  hooks: ToolHooks,
  onApprove: (args: readonly unknown[]) => unknown,
) {
  return Host.fn(
    async (args, call) => {
      const decision = hooks.decisionFor(call.key)
      switch (decision) {
        case "approve": {
          const result = onApprove(args)
          hooks.onTool(name, jsonCloneArgs(args), result)
          return result
        }
        case "reject":
          throw Host.fail("Rejected", `${name} was rejected`)
        case undefined:
          hooks.onPending({
            key: call.key,
            name,
            args: jsonCloneArgs(args),
          })
          return new Promise(() => {})
        default: {
          const unreachable: never = decision
          throw unreachable
        }
      }
    },
    { type: "async", idempotent: true },
  )
}

function jsonCloneArgs(args: readonly unknown[]): unknown[] {
  const cloned: unknown = JSON.parse(JSON.stringify(args))
  return Array.isArray(cloned) ? cloned : []
}

function recordOf(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === "string" ? value : ""
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
