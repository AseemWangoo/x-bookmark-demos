import { SnapshotError } from "psychoscript"
import { z } from "zod"

import { PSYCHOSCRIPT_VERSION, type Decision, type MetaView, type ToolName } from "../shared/types.ts"
import type { Env } from "./env.ts"
import { RunError } from "./errors.ts"
import { readSample } from "./sample.ts"
import { decideRun, getRun, startRun } from "./runs.ts"

const TOOLS = ["searchDocs", "sendEmail", "chargeCard"] as const satisfies readonly ToolName[]

const StartBody = z.object({
  code: z.string().min(1).max(20_000),
})

const DecideBody = z.object({
  decision: z.enum(["approve", "reject"]),
})

export function createApp(env: Env) {
  return {
    handle(request: Request): Promise<Response> {
      return route(env, request).catch((error: unknown) => {
        if (error instanceof RunError) return json({ error: error.message }, error.status)
        if (error instanceof SnapshotError) return json({ error: error.message }, 500)
        const message = error instanceof Error ? error.message : "Run failed."
        return json({ error: message }, 500)
      })
    },
  }
}

export function metaView(env: Env): MetaView {
  return {
    psychoscript: PSYCHOSCRIPT_VERSION,
    bun: Bun.version,
    demo: env.demo,
    license: "MIT",
    tools: TOOLS,
  }
}

async function route(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url)
  const parts = url.pathname.split("/").filter(Boolean)

  if (parts[0] !== "api") return json({ error: "Not found." }, 404)

  if (parts[1] === "meta" && parts.length === 2) {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405)
    return json(metaView(env))
  }

  if (parts[1] === "sample" && parts.length === 2) {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405)
    return json({ code: await readSample(), label: "Hand-authored fixture. Not model output." })
  }

  if (parts[1] !== "runs") return json({ error: "Not found." }, 404)

  if (parts.length === 2 && request.method === "POST") {
    const body = await readBody(request)
    const parsed = StartBody.safeParse(body)
    if (!parsed.success) return json({ error: "Send a script as code." }, 400)
    return json(await startRun(env, parsed.data.code), 201)
  }

  if (parts.length === 3 && request.method === "GET") {
    return json(await getRun(env, parts[2] ?? ""))
  }

  if (parts.length === 4 && parts[3] === "decide" && request.method === "POST") {
    const body = await readBody(request)
    const parsed = DecideBody.safeParse(body)
    if (!parsed.success) return json({ error: "Decision must be approve or reject." }, 400)
    const decision: Decision = parsed.data.decision
    return json(await decideRun(env, parts[2] ?? "", decision))
  }

  return json({ error: "Method not allowed." }, 405)
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new RunError(400, "Invalid JSON.")
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}
