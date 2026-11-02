import { describe, expect, test } from "bun:test"

import { planScripted } from "../server/planner/scripted.ts"
import { APPEND_TEXT, TODO_TEXT, presetPrompts, supportedPlannerMessage } from "../server/planner/steps.ts"

describe("scripted planner", () => {
  test("preset prompts produce a stable step list and deterministic text", () => {
    const todo = planScripted(presetPrompts.todo)
    const again = planScripted("please open the text editor and write a to-do list")
    expect(todo).toEqual(again)
    expect(todo.ok).toBe(true)
    if (!todo.ok) return
    expect(todo.scenario).toBe("todo")
    expect(todo.steps.map((step) => step.op)).toEqual([
      "launch",
      "wait",
      "snapshot",
      "type",
      "snapshot",
      "verify",
      "screenshot",
    ])
    const typed = todo.steps.find((step) => step.op === "type")
    expect(typed && typed.op === "type" ? typed.text : "").toBe(TODO_TEXT)

    const calc = planScripted(presetPrompts.calculator)
    expect(calc.ok).toBe(true)
    if (!calc.ok) return
    expect(calc.steps.map((step) => step.op)).toEqual([
      "launch",
      "wait",
      "snapshot",
      "click",
      "pause",
      "click",
      "pause",
      "click",
      "pause",
      "click",
      "pause",
      "click",
      "pause",
      "snapshot",
      "verify",
      "screenshot",
    ])

    const append = planScripted(presetPrompts.append)
    expect(append.ok).toBe(true)
    if (!append.ok) return
    const appendType = append.steps.find((step) => step.op === "type")
    expect(appendType && appendType.op === "type" ? appendType.text : "").toBe(APPEND_TEXT)
  })

  test("an unknown prompt names the supported presets", () => {
    const plan = planScripted("open a spreadsheet and sum column A")
    expect(plan).toEqual({ ok: false, message: supportedPlannerMessage })
  })
})
