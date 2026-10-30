export type FieldType = "text" | "number" | "date" | "enum" | "boolean"
export type FieldValue = string | number | boolean | null
export type Effort = "none" | "low" | "medium" | "high"

export interface TemplateField {
  key: string
  label: string
  type: FieldType
  unit?: string
  options?: string[]
  hint?: string
}

export interface FormTemplate {
  id: string
  title: string
  description: string
  fields: TemplateField[]
}

export interface BoundingBox {
  x: number
  y: number
  w: number
  h: number
}

export interface FieldResult {
  key: string
  value: FieldValue
  confidence: number
  bbox: BoundingBox | null
  note?: string
}

export interface EditableField extends FieldResult {
  modelValue: FieldValue
  edited: boolean
}

export interface Usage {
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  costUsd: number
}

export interface ExtractionResponse {
  mode: "mock" | "live"
  model: string
  results: FieldResult[]
  usage: Usage
  latencyMs: number
  synthetic?: boolean
}

export interface Sample {
  id: string
  title: string
  kind: string
  description: string
  imageUrl: string
  width: number
  height: number
  templateId: string
}

export interface SourceImage {
  name: string
  imageUrl: string
  width: number
  height: number
  sampleId?: string
  imageDataUrl?: string
}
