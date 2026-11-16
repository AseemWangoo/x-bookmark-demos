import { z } from "zod"

export const formIdSchema = z.enum(["booking", "contact", "destination"])

export type FormId = z.infer<typeof formIdSchema>

const choiceSchema = z.object({
  value: z.string(),
  label: z.string(),
})

export const fieldSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    inputType: z.enum(["text", "email"]),
    autoComplete: z.string().optional(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
  }),
  z.object({
    kind: z.literal("textarea"),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
  }),
  z.object({
    kind: z.literal("number"),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    min: z.number(),
    required: z.boolean().optional(),
    defaultValue: z.number().optional(),
  }),
  z.object({
    kind: z.literal("select"),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    placeholder: z.string(),
    required: z.boolean().optional(),
    items: z.array(choiceSchema).min(1),
  }),
  z.object({
    kind: z.literal("combobox"),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    placeholder: z.string(),
    required: z.boolean().optional(),
    items: z.array(choiceSchema).min(1),
  }),
  z.object({
    kind: z.literal("date"),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    mode: z.enum(["single", "range"]),
    required: z.boolean().optional(),
    startLabel: z.string(),
    endLabel: z.string().optional(),
    startName: z.string().optional(),
    endName: z.string().optional(),
  }),
])

export type FieldSpec = z.infer<typeof fieldSpecSchema>

export const formSpecSchema = z.object({
  id: formIdSchema,
  title: z.string(),
  description: z.string(),
  submitLabel: z.string(),
  fallback: z.boolean(),
  matchNote: z.string(),
  fields: z.array(fieldSpecSchema).min(1),
})

export type FormSpec = z.infer<typeof formSpecSchema>

export type AgentView = {
  ref: string
  component: string
  label?: string
  value?: unknown
  actions: string[]
  items?: { value: string; label: string }[]
  offPage?: boolean
}

export type AgentStep = {
  ref: string
  action: string
  args?: unknown[]
}

export type ActResult = {
  ok: boolean
  error?: { step: number; message: string }
  steps: unknown[]
  values: Record<string, unknown>
  appeared: AgentView[]
}

export type AgentBridge = {
  snapshot: () => AgentView[]
  query: (input: {
    text?: string
    within?: string
    kind?: string
  }) => Promise<AgentView[] | { error: string }>
  act: (input: { steps: AgentStep[] }) => Promise<ActResult>
}

export const fillPlanSchema = z.object({
  steps: z
    .array(
      z.object({
        ref: z.string().min(1),
        action: z.string().min(1),
        args: z.array(z.unknown()).optional(),
      }),
    )
    .min(1),
  skipped: z.array(z.string()),
})

export type FillPlan = z.infer<typeof fillPlanSchema>

export type ToolName = "snapshot" | "query" | "act"

export type ToolCallLog = {
  id: string
  tool: ToolName
  input: unknown
  output: unknown
}

export type WebMcpStatus = {
  registerToolType: string
  supported: boolean
  summary: string
}
