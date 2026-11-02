import {
  APPEND_TEXT,
  CALC_RESULT,
  TODO_TEXT,
  buttonQuery,
  calculatorDisplayQuery,
  editorDocumentQuery,
  presetPrompts,
  supportedPlannerMessage,
  type AbstractStep,
  type Plan,
  type ScenarioId,
} from "./steps.ts"

const CLICK_SETTLE_MS = 320

export function planScripted(prompt: string): Plan {
  const scenario = matchScenario(prompt)
  if (!scenario) return { ok: false, message: supportedPlannerMessage }
  return { ok: true, scenario, steps: stepsFor(scenario) }
}

export function matchScenario(prompt: string): ScenarioId | null {
  const text = prompt.trim()
  if (text === presetPrompts.todo || text === presetPrompts.calculator || text === presetPrompts.append) {
    if (text === presetPrompts.todo) return "todo"
    if (text === presetPrompts.calculator) return "calculator"
    return "append"
  }
  if (/calculator/i.test(text) && /12/.test(text) && /7/.test(text)) return "calculator"
  if (/append/i.test(text) && /ship the demo/i.test(text)) return "append"
  if (/text editor/i.test(text) && /to-?do/i.test(text)) return "todo"
  return null
}

function stepsFor(scenario: ScenarioId): AbstractStep[] {
  switch (scenario) {
    case "todo":
      return editorSteps(TODO_TEXT, "Type the to-do list into the document", TODO_TEXT)
    case "append":
      return editorSteps(APPEND_TEXT, "Append “Ship the demo” to the document", APPEND_TEXT)
    case "calculator":
      return calculatorSteps()
    default: {
      const neverScenario: never = scenario
      return neverScenario
    }
  }
}

function editorSteps(text: string, typeIntent: string, contains: string): AbstractStep[] {
  return [
    { op: "launch", app: "gnome-text-editor", intent: "Launch the text editor" },
    {
      op: "wait",
      app: "gnome-text-editor",
      window: "Text Editor",
      timeoutMs: 15000,
      intent: "Wait for the Text Editor window",
    },
    { op: "snapshot", app: "gnome-text-editor", intent: "Snapshot the text editor" },
    {
      op: "type",
      app: "gnome-text-editor",
      query: editorDocumentQuery,
      text,
      intent: typeIntent,
    },
    {
      op: "snapshot",
      app: "gnome-text-editor",
      intent: "Snapshot again before reading the document back",
    },
    {
      op: "verify",
      app: "gnome-text-editor",
      query: editorDocumentQuery,
      contains,
      intent: "Verify the document contains the typed text",
    },
    { op: "screenshot", app: "gnome-text-editor", intent: "Capture the text editor window" },
  ]
}

function calculatorSteps(): AbstractStep[] {
  const clicks: Array<{ name: string; intent: string }> = [
    { name: "1", intent: "Press 1" },
    { name: "2", intent: "Press 2" },
    { name: "×", intent: "Press multiply" },
    { name: "7", intent: "Press 7" },
    { name: "=", intent: "Press equals" },
  ]
  const steps: AbstractStep[] = [
    { op: "launch", app: "gnome-calculator", intent: "Launch the calculator" },
    {
      op: "wait",
      app: "gnome-calculator",
      window: "Calculator",
      timeoutMs: 15000,
      intent: "Wait for the Calculator window",
    },
    { op: "snapshot", app: "gnome-calculator", intent: "Snapshot the calculator" },
  ]
  for (const click of clicks) {
    steps.push({
      op: "click",
      app: "gnome-calculator",
      query: buttonQuery(click.name),
      intent: click.intent,
    })
    steps.push({
      op: "pause",
      ms: click.name === "=" ? 500 : CLICK_SETTLE_MS,
      intent:
        click.name === "="
          ? "Wait for the calculator to show the result"
          : "Wait so the next GTK4 click is not dropped",
    })
  }
  steps.push(
    { op: "snapshot", app: "gnome-calculator", intent: "Snapshot the calculator result" },
    {
      op: "verify",
      app: "gnome-calculator",
      query: calculatorDisplayQuery,
      contains: CALC_RESULT,
      intent: "Verify the display reads 84",
    },
    { op: "screenshot", app: "gnome-calculator", intent: "Capture the calculator window" },
  )
  return steps
}
