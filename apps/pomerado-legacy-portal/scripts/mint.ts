import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stderr as output } from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startPortal } from "../portal/server.ts";
import { portalCreds, portalUrl, readNodeVersion, readPomeradoVersion, nodeBin } from "../server/env.ts";
import {
  decideMintAnswer,
  followJob,
  type PendingQuestion,
  type ToolCaller,
} from "../server/jobs.ts";
import { mcpCliPath, unwrapToolResult } from "../server/pomerado-client.ts";
import { appRoot } from "../server/http.ts";

export const MINTS = [
  {
    name: "list_invoices",
    effect: "read" as const,
    intent:
      "Sign in and list invoices, optionally filtered by status (open, paid, overdue or all) and vendor name, returning every matching row across all pages with invoice number, vendor, PO, amount, due date and status.",
    input: { status: "overdue" },
  },
  {
    name: "list_vendors",
    effect: "read" as const,
    intent: "Sign in and list all vendors with ID, name, email, category and payment terms.",
    input: {},
  },
  {
    name: "add_vendor",
    effect: "write" as const,
    intent:
      "Sign in and create a new vendor with the given name, email, category and payment terms, confirming the creation, and return the new vendor ID.",
    input: {
      name: "Globex Supply",
      email: "ap@globex.example",
      category: "Hardware",
      terms: "Net 30",
    },
  },
];

export const MACHINE_LOCAL_FILES = ["mcp.mjs", "mcp.json", "README.md"] as const;

export interface MintLogEntry {
  name: string;
  minutes: number;
  build: string;
  summary: string | null;
}

export interface MintLog {
  pomeradoVersion: string | null;
  nodeVersion: string | null;
  date: string;
  portalUrl: string;
  urlPath: "127.0.0.1" | "legacy-portal.test";
  mints: MintLogEntry[];
}

export async function removeMachineLocalFiles(directory: string): Promise<void> {
  for (const name of MACHINE_LOCAL_FILES) {
    await rm(join(directory, name), { force: true });
  }
  await rm(join(directory, ".jobs"), { recursive: true, force: true });
}

async function answerQuestion(question: PendingQuestion) {
  const decision = decideMintAnswer(question, portalCreds());
  if (decision.ok || !input.isTTY) return decision;
  const rl = readline.createInterface({ input, output });
  const text = (await rl.question(`${question.prompt ?? question.type}\n> `)).trim();
  rl.close();
  if (question.type === "confirm") {
    return { ok: true as const, value: { confirmed: /^y/i.test(text) }, note: "answered from the terminal" };
  }
  if (question.type === "text") {
    return { ok: true as const, value: text, note: "answered from the terminal" };
  }
  return decision;
}

function stringEnv(includeKey: boolean): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (!includeKey && key === "OPENAI_API_KEY") continue;
    env[key] = value;
  }
  return env;
}

async function connectMint(root: string, endpoint?: string): Promise<{ caller: ToolCaller; close: () => Promise<void> }> {
  const args = [mcpCliPath(appRoot), "mint", "--root", root];
  if (endpoint) args.push("--endpoint", endpoint);
  if (process.env.POMERADO_HEADED === "1") args.push("--headed");
  const transport = new StdioClientTransport({
    command: nodeBin(),
    args,
    env: stringEnv(true),
    stderr: "pipe",
  });
  const client = new Client({ name: "pomerado-legacy-portal-mint", version: "0.0.0" });
  await client.connect(transport);
  return {
    caller: {
      async call(name, toolArgs) {
        const result = await client.callTool({ name, arguments: toolArgs });
        return unwrapToolResult(result);
      },
    },
    close: () => client.close(),
  };
}

export async function mintAll(url: string, endpoint?: string): Promise<MintLogEntry[]> {
  const root = join(appRoot, "integrations");
  await mkdir(root, { recursive: true });
  const session = await connectMint(root, endpoint);
  const entries: MintLogEntry[] = [];
  try {
    for (const spec of MINTS) {
      await rm(join(root, spec.name), { recursive: true, force: true });
      const started = Date.now();
      const exchange = await followJob(
        session.caller,
        "mint",
        { name: spec.name, url, intent: spec.intent, effect: spec.effect, input: spec.input },
        answerQuestion,
      );
      const minutes = (Date.now() - started) / 60_000;
      const output = exchange.output as { build?: string; summary?: string } | null;
      const build = output?.build ?? "incomplete";
      const summary = output?.summary ?? exchange.error ?? null;
      entries.push({ name: spec.name, minutes, build, summary });
      if (exchange.error || build !== "published") {
        throw new Error(`${spec.name} mint ${build}: ${summary ?? "no summary"}`);
      }
      await removeMachineLocalFiles(join(root, spec.name));
    }
  } finally {
    await session.close();
  }
  return entries;
}

export async function launchTestEndpoint(): Promise<{ endpoint: string; close: () => Promise<void> }> {
  const playwright = await import("playwright");
  const server = await playwright.chromium.launchServer({
    args: ["--host-resolver-rules=MAP legacy-portal.test 127.0.0.1"],
  });
  return { endpoint: server.wsEndpoint(), close: () => server.close() };
}

async function resetPortal(): Promise<void> {
  const response = await fetch(new URL("/__reset", portalUrl()), { method: "POST" });
  if (!response.ok) throw new Error(`portal reset failed (${response.status})`);
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required to mint. Running a minted integration does not need a key.");
    process.exitCode = 1;
    return;
  }
  let portal: ReturnType<typeof startPortal> | undefined;
  try {
    portal = startPortal();
  } catch (error) {
    console.error(`portal already running (${error instanceof Error ? error.message : "bind failed"})`);
  }
  await resetPortal();
  const directUrl = `${portalUrl()}/login`;
  let entries: MintLogEntry[];
  let urlPath: MintLog["urlPath"] = "127.0.0.1";
  try {
    entries = await mintAll(directUrl);
  } catch (error) {
    console.error(`direct mint failed (${error instanceof Error ? error.message : "error"}); trying legacy-portal.test`);
    const browser = await launchTestEndpoint();
    urlPath = "legacy-portal.test";
    try {
      await resetPortal();
      entries = await mintAll("http://legacy-portal.test:4517/login", browser.endpoint);
    } finally {
      await browser.close();
    }
  }
  await resetPortal();
  const log: MintLog = {
    pomeradoVersion: readPomeradoVersion(join(appRoot, "node_modules", "pomerado", "package.json")),
    nodeVersion: await readNodeVersion(),
    date: new Date().toISOString(),
    portalUrl: urlPath === "127.0.0.1" ? directUrl : "http://legacy-portal.test:4517/login",
    urlPath,
    mints: entries,
  };
  await writeFile(join(appRoot, "integrations", "MINT_LOG.json"), `${JSON.stringify(log, null, 2)}\n`);
  console.error(JSON.stringify(log, null, 2));
  portal?.stop();
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "mint failed");
    process.exitCode = 1;
  });
}
