import type { FieldValue, TemplateField } from "../src/lib/types"

function parseDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (iso) return value.trim()
  const local = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value.trim())
  if (!local) return null
  const [, day, month, year] = local
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function parseNumber(value: string): number | null {
  const match = value.replace(/,/g, "").match(/[-+]?\d*\.?\d+/)
  if (!match) return null
  const number = Number(match[0])
  return Number.isFinite(number) ? number : null
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (["yes", "true", "checked", "✓", "x"].includes(normalized)) return true
  if (["no", "false", "unchecked"].includes(normalized)) return false
  return null
}

export function coerceValue(
  field: TemplateField,
  value: string | null,
  confidence: number,
): { value: FieldValue; confidence: number; note?: string } {
  if (value === null) return { value: null, confidence }

  let parsed: FieldValue | null
  switch (field.type) {
    case "number":
      parsed = parseNumber(value.replace(/^[Ø⌀]\s*/, ""))
      break
    case "date":
      parsed = parseDate(value)
      break
    case "boolean":
      parsed = parseBoolean(value)
      break
    case "text":
    case "enum":
      return { value: value.trim(), confidence }
    default: {
      const exhaustive: never = field.type
      throw new Error(`Unhandled field type: ${exhaustive}`)
    }
  }

  if (parsed === null) {
    return { value, confidence: Math.min(confidence, 0.5), note: "unparsed" }
  }
  return { value: parsed, confidence }
}
