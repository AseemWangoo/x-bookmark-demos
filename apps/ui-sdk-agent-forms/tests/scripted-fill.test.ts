import { describe, expect, test } from "bun:test"

import { fillPlanSchema, type AgentBridge, type AgentView } from "../src/adapter/types"
import { buildFillSteps, runScriptedFill } from "../src/adapter/scripted-fill"

const bookingSnapshot: AgentView[] = [
  {
    ref: "c1",
    component: "input",
    label: "Guest name",
    value: "",
    actions: ["setValue", "clear"],
  },
  {
    ref: "c2",
    component: "date-picker",
    label: "Stay",
    value: null,
    actions: ["setOpen", "setValue", "clear", "setMonth", "previous", "next"],
  },
  {
    ref: "c3",
    component: "number-input",
    label: "Guests",
    value: 1,
    actions: ["setValue", "increment", "decrement"],
  },
  {
    ref: "c4",
    component: "select",
    label: "Room type",
    value: null,
    actions: ["setOpen", "setValue", "clear", "setQuery"],
  },
  {
    ref: "c5",
    component: "button",
    label: "Request booking",
    actions: ["press"],
  },
]

const roomQuery: AgentView = {
  ref: "c4",
  component: "select",
  label: "Room type",
  actions: ["setOpen", "setValue", "clear", "setQuery"],
  items: [
    { value: "standard", label: "Standard" },
    { value: "deluxe", label: "Deluxe" },
    { value: "suite", label: "Suite" },
  ],
}

describe("buildFillSteps", () => {
  test("builds setValue steps from the snapshot and query items", () => {
    const plan = buildFillSteps("booking", bookingSnapshot, [roomQuery])
    expect(fillPlanSchema.parse(plan).steps).toEqual([
      { ref: "c1", action: "setValue", args: ["Ada Lovelace"] },
      { ref: "c2", action: "setValue", args: [["2026-12-14", "2026-12-18"]] },
      { ref: "c3", action: "setValue", args: [2] },
      { ref: "c4", action: "setValue", args: ["deluxe"] },
    ])
    expect(plan.steps.some((step) => step.action === "press")).toBe(false)
  })

  test("skips a control whose snapshot does not list setValue", () => {
    const snapshot = bookingSnapshot.map((component) =>
      component.ref === "c2" ? { ...component, actions: ["setOpen", "setMonth"] } : component,
    )
    const plan = buildFillSteps("booking", snapshot, [roomQuery])
    expect(plan.steps.map((step) => step.ref)).toEqual(["c1", "c3", "c4"])
    expect(plan.skipped.some((line) => line.includes("Stay"))).toBe(true)
  })

  test("skips a select when the query items do not include the value", () => {
    const plan = buildFillSteps("booking", bookingSnapshot, [
      { ...roomQuery, items: [{ value: "standard", label: "Standard" }] },
    ])
    expect(plan.steps.some((step) => step.ref === "c4")).toBe(false)
    expect(plan.skipped.some((line) => line.includes("deluxe"))).toBe(true)
  })
})

describe("runScriptedFill", () => {
  test("calls snapshot, then query, then act", async () => {
    const order: string[] = []
    let acted: unknown
    const bridge: AgentBridge = {
      snapshot: () => {
        order.push("snapshot")
        return bookingSnapshot
      },
      query: async (input) => {
        order.push(`query:${input.within}`)
        return [roomQuery]
      },
      act: async (input) => {
        order.push("act")
        acted = input.steps
        return { ok: true, steps: [], values: {}, appeared: [] }
      },
    }
    const logs: string[] = []
    const plan = await runScriptedFill(bridge, "booking", (entry) => logs.push(entry.tool))
    expect(order).toEqual(["snapshot", "query:Room type", "act"])
    expect(logs).toEqual(["snapshot", "query", "act"])
    expect(fillPlanSchema.parse(plan).steps).toHaveLength(4)
    expect(acted).toEqual(plan.steps)
  })
})
