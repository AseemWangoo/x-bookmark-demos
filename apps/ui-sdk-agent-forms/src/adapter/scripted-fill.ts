import type {
  AgentBridge,
  AgentStep,
  AgentView,
  FillPlan,
  FormId,
  ToolCallLog,
  ToolName,
} from "./types"

export const SCRIPTED_AGENT_LABEL =
  "Scripted agent — calls this page's snapshot / query / act tools directly. No model, no API key."

type Intent = {
  kind: string
  label: RegExp
  value: unknown
  list: boolean
}

const INTENTS: Record<FormId, Intent[]> = {
  booking: [
    { kind: "input", label: /^guest name$/i, value: "Ada Lovelace", list: false },
    {
      kind: "date-picker",
      label: /^stay$/i,
      value: ["2026-12-14", "2026-12-18"],
      list: false,
    },
    { kind: "number-input", label: /^guests$/i, value: 2, list: false },
    { kind: "select", label: /^room type$/i, value: "deluxe", list: true },
  ],
  contact: [
    { kind: "input", label: /^name$/i, value: "Ada Lovelace", list: false },
    { kind: "input", label: /^email$/i, value: "ada@example.com", list: false },
    { kind: "select", label: /^topic$/i, value: "booking", list: true },
    {
      kind: "textarea",
      label: /^message$/i,
      value: "Arriving after 8pm.",
      list: false,
    },
  ],
  destination: [
    { kind: "input", label: /^traveler$/i, value: "Ada Lovelace", list: false },
    { kind: "combobox", label: /^destination$/i, value: "kyoto", list: true },
    { kind: "date-picker", label: /^departure$/i, value: "2026-12-14", list: false },
  ],
}

function intentsFor(formId: FormId): Intent[] {
  switch (formId) {
    case "booking":
    case "contact":
    case "destination":
      return INTENTS[formId]
    default: {
      const exhaustive: never = formId
      return exhaustive
    }
  }
}

function findComponent(snapshot: AgentView[], intent: Intent): AgentView | undefined {
  const candidates = snapshot.filter(
    (component) =>
      component.component === intent.kind &&
      component.ref !== "more" &&
      component.offPage !== true,
  )
  const labeled = candidates.filter((component) => intent.label.test(component.label ?? ""))
  if (labeled.length > 0) return labeled[0]
  if (candidates.length === 1) return candidates[0]
  return undefined
}

function listedValue(
  component: AgentView,
  queries: AgentView[],
  wanted: string,
): string | undefined {
  const queried = queries.find(
    (entry) => entry.ref === component.ref || entry.label === component.label,
  )
  const items = queried?.items ?? []
  return items.find((item) => item.value === wanted || item.label.toLowerCase() === wanted)?.value
}

export function buildFillSteps(
  formId: FormId,
  snapshot: AgentView[],
  queries: AgentView[],
): FillPlan {
  const steps: AgentStep[] = []
  const skipped: string[] = []

  for (const intent of intentsFor(formId)) {
    const component = findComponent(snapshot, intent)
    const name = intent.label.source
    if (!component) {
      skipped.push(`No ${intent.kind} matched ${name}.`)
      continue
    }
    if (!component.actions.includes("setValue")) {
      skipped.push(
        `${component.label ?? component.ref} has no setValue. Actions: ${component.actions.join(", ") || "none"}.`,
      )
      continue
    }
    if (intent.list) {
      const wanted = String(intent.value)
      const value = listedValue(component, queries, wanted)
      if (!value) {
        skipped.push(
          `${component.label ?? component.ref}: query items do not include ${wanted}.`,
        )
        continue
      }
      steps.push({ ref: component.ref, action: "setValue", args: [value] })
      continue
    }
    steps.push({ ref: component.ref, action: "setValue", args: [intent.value] })
  }

  return { steps, skipped }
}

export function queryLabels(formId: FormId, snapshot: AgentView[]): string[] {
  const labels: string[] = []
  for (const intent of intentsFor(formId)) {
    if (!intent.list) continue
    const component = findComponent(snapshot, intent)
    if (component?.label) labels.push(component.label)
  }
  return labels
}

function logEntry(tool: ToolName, input: unknown, output: unknown): ToolCallLog {
  return {
    id: crypto.randomUUID(),
    tool,
    input,
    output,
  }
}

export async function runScriptedFill(
  bridge: AgentBridge,
  formId: FormId,
  onLog: (entry: ToolCallLog) => void,
): Promise<FillPlan> {
  const snapshot = bridge.snapshot()
  onLog(logEntry("snapshot", {}, snapshot))

  const queries: AgentView[] = []
  for (const within of queryLabels(formId, snapshot)) {
    const output = await bridge.query({ within })
    onLog(logEntry("query", { within }, output))
    if (Array.isArray(output)) queries.push(...output)
  }

  const plan = buildFillSteps(formId, snapshot, queries)
  if (plan.steps.length === 0) {
    onLog(
      logEntry("act", { steps: [] }, { ok: false, skipped: plan.skipped, steps: [] }),
    )
    return plan
  }

  const result = await bridge.act({ steps: plan.steps })
  onLog(logEntry("act", { steps: plan.steps }, { ...result, skipped: plan.skipped }))
  return plan
}
