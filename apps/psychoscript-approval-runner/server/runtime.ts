import { Runtime } from "psychoscript"

import type { Env } from "./env.ts"
import { makeGlobals, type ToolHooks } from "./tools.ts"

export function makeRuntime(env: Env, hooks: ToolHooks) {
  return Runtime.make({
    limits: { timeoutMs: env.timeoutMs, maxOutputBytes: 64_000 },
    globals: () => makeGlobals(hooks),
  })
}
