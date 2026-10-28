import { existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallResult } from "../src/lib/types.ts";
import { nodeBin, portalCreds } from "./env.ts";
import {
  assertIdempotencyKey,
  decideRunAnswer,
  followJob,
  newIdempotencyKey,
  type ToolCaller,
} from "./jobs.ts";

interface WarmSession {
  caller: ToolCaller;
  close: () => Promise<void>;
  coldMs: number | null;
  warmMs: number | null;
}

const sessions = new Map<string, WarmSession>();

export function mcpCliPath(appRoot: string): string {
  const bin = join(appRoot, "node_modules", ".bin", "pomerado-mcp");
  if (existsSync(bin)) return bin;
  return join(appRoot, "node_modules", "pomerado", "dist", "typescript", "src", "standalone", "mcp-cli.js");
}

function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (key === "OPENAI_API_KEY") continue;
    env[key] = value;
  }
  return env;
}

function serveArgs(appRoot: string, integration: string): string[] {
  const args = ["serve", "--artifact", join(appRoot, "integrations", integration)];
  if (process.env.POMERADO_ENDPOINT) args.push("--endpoint", process.env.POMERADO_ENDPOINT);
  if (process.env.POMERADO_HEADED === "1") args.push("--headed");
  return [mcpCliPath(appRoot), ...args];
}

export function unwrapToolResult(result: unknown): unknown {
  if (typeof result !== "object" || result === null) return result;
  const record = result as {
    structuredContent?: unknown;
    toolResult?: unknown;
    content?: readonly { type?: string; text?: string }[];
  };
  if (record.structuredContent !== undefined) return record.structuredContent;
  if (record.toolResult !== undefined) return unwrapToolResult(record.toolResult);
  const text = record.content?.find((item) => item.type === "text")?.text;
  if (text === undefined) return result;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function connect(appRoot: string, integration: string): Promise<WarmSession> {
  const transport = new StdioClientTransport({
    command: nodeBin(),
    args: serveArgs(appRoot, integration),
    env: childEnv(),
    stderr: "pipe",
  });
  const client = new Client({ name: "pomerado-legacy-portal", version: "0.0.0" });
  await client.connect(transport);
  const caller: ToolCaller = {
    async call(name, args) {
      const result = await client.callTool({ name, arguments: args });
      return unwrapToolResult(result);
    },
  };
  return {
    caller,
    close: async () => {
      await client.close();
    },
    coldMs: null,
    warmMs: null,
  };
}

export async function runToolCall(
  caller: ToolCaller,
  request: {
    integration: string;
    input: Record<string, unknown>;
    effect: "read" | "write";
    credentials: { username: string; password: string };
    idempotencyKey?: string;
  },
): Promise<CallResult> {
  const key = request.effect === "write" ? (request.idempotencyKey ?? newIdempotencyKey()) : undefined;
  if (key !== undefined) assertIdempotencyKey(key);
  const toolArgs: Record<string, unknown> =
    key === undefined ? { input: request.input } : { input: request.input, idempotency_key: key };
  const started = performance.now();
  const exchange = await followJob(caller, request.integration, toolArgs, (question) =>
    decideRunAnswer(question, request.credentials),
  );
  return {
    integration: request.integration,
    arguments: {
      input: toolArgs.input,
      ...(typeof toolArgs.idempotency_key === "string" ? { idempotency_key: toolArgs.idempotency_key } : {}),
    },
    trail: exchange.trail,
    output: exchange.output,
    ...(exchange.error ? { error: exchange.error } : {}),
    possibleCommit: exchange.possibleCommit,
    ms: Math.round(performance.now() - started),
    cold: false,
    coldMs: null,
    warmMs: null,
    latencyLabel: "measured",
    synthetic: false,
    recordedAt: null,
  };
}

export async function callIntegration(
  appRoot: string,
  integration: string,
  input: Record<string, unknown>,
  effect: "read" | "write",
  idempotencyKey?: string,
): Promise<CallResult> {
  let session = sessions.get(integration);
  const cold = session === undefined;
  const started = performance.now();
  if (!session) {
    session = await connect(appRoot, integration);
    sessions.set(integration, session);
  }
  const creds = portalCreds();
  const result = await runToolCall(session.caller, {
    integration,
    input,
    effect,
    credentials: creds,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
  const ms = Math.round(performance.now() - started);
  if (cold) session.coldMs = ms;
  else session.warmMs = ms;
  return { ...result, ms, cold, coldMs: session.coldMs, warmMs: session.warmMs };
}

export async function shutdownPool(): Promise<void> {
  const open = [...sessions.values()];
  sessions.clear();
  await Promise.all(open.map((session) => session.close()));
}
