import type { TimelineEvent } from "../../shared/types.ts"

export function formatJson(value: unknown): string {
  const text = JSON.stringify(value, null, 2)
  return text ?? "null"
}

export function formatTime(at: string): string {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return at
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function describeEvent(event: TimelineEvent): string {
  switch (event.type) {
    case "started":
      return "Started"
    case "tool":
      return `${event.name} resolved`
    case "paused":
      return `Paused on ${event.name} · ${event.snapshotBytes} bytes`
    case "resumed":
      return `Resumed ${event.name} · ${event.decision}`
    case "finished":
      return event.ok ? "Finished" : `Finished with ${event.error.kind}`
    default: {
      const unreachable: never = event
      return unreachable
    }
  }
}
