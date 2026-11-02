import { z } from "zod"

export const scenarioIds = ["todo", "calculator", "append"] as const
export type ScenarioId = (typeof scenarioIds)[number]

export const TODO_TEXT = "To-do:\n- Plan\n- Build\n- Record demo"
export const APPEND_TEXT = "Ship the demo"
export const CALC_RESULT = "84"

export const presetPrompts: Record<ScenarioId, string> = {
  todo: "Open the text editor and write a to-do list",
  calculator: "Open the calculator and compute 12 × 7",
  append: "In the text editor, append 'Ship the demo'",
}

export const refQuerySchema = z.looseObject({
  role: z.string(),
  name: z.string().optional(),
  action: z.string().optional(),
})

export type RefQuery = z.infer<typeof refQuerySchema>

const launchStep = z.looseObject({
  op: z.literal("launch"),
  app: z.string(),
  intent: z.string(),
})
const waitStep = z.looseObject({
  op: z.literal("wait"),
  app: z.string(),
  window: z.string(),
  timeoutMs: z.number(),
  intent: z.string(),
})
const pauseStep = z.looseObject({
  op: z.literal("pause"),
  ms: z.number(),
  intent: z.string(),
})
const snapshotStep = z.looseObject({
  op: z.literal("snapshot"),
  app: z.string(),
  intent: z.string(),
})
const clickStep = z.looseObject({
  op: z.literal("click"),
  app: z.string(),
  query: refQuerySchema,
  intent: z.string(),
})
const typeStep = z.looseObject({
  op: z.literal("type"),
  app: z.string(),
  query: refQuerySchema,
  text: z.string(),
  intent: z.string(),
})
const verifyStep = z.looseObject({
  op: z.literal("verify"),
  app: z.string(),
  query: refQuerySchema,
  contains: z.string(),
  intent: z.string(),
})
const screenshotStep = z.looseObject({
  op: z.literal("screenshot"),
  app: z.string(),
  intent: z.string(),
})

export const abstractStepSchema = z.discriminatedUnion("op", [
  launchStep,
  waitStep,
  pauseStep,
  snapshotStep,
  clickStep,
  typeStep,
  verifyStep,
  screenshotStep,
])

export type AbstractStep = z.infer<typeof abstractStepSchema>

export type Plan =
  | { ok: true; scenario: ScenarioId; steps: AbstractStep[] }
  | { ok: false; message: string }

export const supportedPlannerMessage = `Scripted planner supports: "${presetPrompts.todo}"; "${presetPrompts.calculator}"; "${presetPrompts.append}".`

export const editorDocumentQuery: RefQuery = { role: "textfield", action: "TypeText" }
export const calculatorDisplayQuery: RefQuery = { role: "textfield", action: "TypeText" }

export function buttonQuery(name: string): RefQuery {
  return { role: "button", name }
}
