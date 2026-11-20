import type { Effort, Priority, Status } from "../../shared/schema.ts";

export function statusLabel(status: Status): string {
  switch (status) {
    case "todo":
      return "To do";
    case "in_progress":
      return "In progress";
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    default: {
      const unknown: never = status;
      return unknown;
    }
  }
}

export function priorityLabel(priority: Priority): string {
  switch (priority) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const unknown: never = priority;
      return unknown;
    }
  }
}

export function effortLabel(effort: Effort): string {
  switch (effort) {
    case "no_think":
      return "Flash (no_think)";
    case "high":
      return "Think (high)";
    default: {
      const unknown: never = effort;
      return unknown;
    }
  }
}

export function formatMs(value: number | null): string {
  if (value === null) return "n/a";
  return `${Math.round(value)} ms`;
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(6)}`;
}

export function formatCny(value: number): string {
  return `¥${value.toFixed(4)}`;
}
