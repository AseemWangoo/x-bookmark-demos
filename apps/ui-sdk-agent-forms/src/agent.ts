import { createAgent, registerTools } from "@ui-sdk/react/agent"

function allow(step: { action: string; args: unknown[] }): boolean {
  return step.action !== "press" || confirm(`Press ${String(step.args[0] ?? "button")}?`)
}

const agent = createAgent({ allow })

Object.assign(window, { agent })

const unregister = registerTools(agent, { allow })

if (import.meta.hot) {
  import.meta.hot.dispose(unregister)
}

export { agent }
