import { describe, expect, test } from "bun:test"

import { formSpecSchema } from "../src/adapter/types"
import { matchTemplate, SEED_PROMPT, TEMPLATE_MODE_LABEL } from "../src/form/templates"

describe("matchTemplate", () => {
  test("maps the booking seed to the booking form", () => {
    const spec = matchTemplate(SEED_PROMPT)
    expect(formSpecSchema.parse(spec).id).toBe("booking")
    expect(spec.fallback).toBe(false)
    expect(spec.matchNote).toBe(TEMPLATE_MODE_LABEL)
    expect(spec.fields.map((field) => field.kind)).toEqual([
      "text",
      "date",
      "number",
      "select",
    ])
    const date = spec.fields.find((field) => field.kind === "date")
    expect(date?.mode).toBe("range")
    const guests = spec.fields.find((field) => field.kind === "number")
    expect(guests?.min).toBe(1)
  })

  test("maps a contact prompt to the contact form", () => {
    const spec = matchTemplate("contact form with name, email and topic")
    expect(spec.id).toBe("contact")
    expect(spec.fallback).toBe(false)
    expect(spec.fields.some((field) => field.kind === "textarea")).toBe(true)
  })

  test("maps a combobox prompt to the destination form", () => {
    const spec = matchTemplate("searchable destination form with a combobox")
    expect(spec.id).toBe("destination")
    expect(spec.fields.some((field) => field.kind === "combobox")).toBe(true)
  })

  test("falls back to booking for an unknown prompt", () => {
    const spec = matchTemplate("make me a sandwich")
    expect(spec.id).toBe("booking")
    expect(spec.fallback).toBe(true)
    expect(spec.matchNote).toContain("No recorded template matched")
    expect(spec.matchNote).toContain(TEMPLATE_MODE_LABEL)
  })
})
