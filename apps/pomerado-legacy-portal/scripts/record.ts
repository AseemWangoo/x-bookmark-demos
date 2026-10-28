import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { startPortal } from "../portal/server.ts";
import { detectMode, portalUrl, readPomeradoVersion } from "../server/env.ts";
import { appRoot } from "../server/http.ts";
import { shutdownPool, callIntegration } from "../server/pomerado-client.ts";
import { routeText } from "../server/router.ts";
import type { ReplayFixture } from "../server/schema.ts";

const EXAMPLES = [
  "list overdue invoices",
  "show open invoices from Acme",
  "list vendors",
  "add a new vendor Globex Supply, ap@globex.example, Hardware, Net 30",
] as const;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function fileFor(text: string): string {
  switch (text) {
    case "list overdue invoices":
      return "list_invoices.overdue.json";
    case "show open invoices from Acme":
      return "list_invoices.open-acme.json";
    case "list vendors":
      return "list_vendors.json";
    case "add a new vendor Globex Supply, ap@globex.example, Hardware, Net 30":
      return "add_vendor.json";
    default:
      return "fixture.json";
  }
}

async function reset(): Promise<void> {
  const response = await fetch(new URL("/__reset", portalUrl()), { method: "POST" });
  if (!response.ok) throw new Error(`portal reset failed (${response.status})`);
}

async function recordOne(text: string, version: string | null, recordedAt: string): Promise<void> {
  const route = routeText(text);
  if (route.kind !== "call" && route.kind !== "needs-confirm") {
    throw new Error(`example did not route: ${text}`);
  }
  const input: Record<string, unknown> = { ...route.input };
  await shutdownPool();
  const samples: number[] = [];
  let last: Awaited<ReturnType<typeof callIntegration>> | undefined;
  for (let i = 0; i < 3; i++) {
    if (route.kind === "needs-confirm") await reset();
    last = await callIntegration(
      appRoot,
      route.integration,
      input,
      route.kind === "needs-confirm" ? "write" : "read",
    );
    samples.push(last.ms);
  }
  if (!last) throw new Error("no sample");
  const fixture: ReplayFixture = {
    recordedAt,
    pomeradoVersion: version,
    synthetic: false,
    integration: route.integration,
    input,
    arguments: last.arguments,
    trail: last.trail,
    output: last.output,
    coldMs: samples[0] ?? last.ms,
    warmMs: median(samples.slice(1)),
  };
  await writeFile(
    join(appRoot, "fixtures", "replay", fileFor(text)),
    `${JSON.stringify(fixture, null, 2)}\n`,
  );
}

async function main(): Promise<void> {
  const mode = await detectMode(appRoot, null);
  if (mode.mode !== "local") {
    console.error(`record needs local mode (${mode.reason})`);
    process.exitCode = 1;
    return;
  }
  let portal: ReturnType<typeof startPortal> | undefined;
  try {
    portal = startPortal();
  } catch (error) {
    console.error(`using an existing portal (${error instanceof Error ? error.message : "bind failed"})`);
  }
  await reset();
  const recordedAt = new Date().toISOString();
  const version = readPomeradoVersion(join(appRoot, "node_modules", "pomerado", "package.json"));
  for (const example of EXAMPLES) {
    await recordOne(example, version, recordedAt);
  }
  await reset();
  await shutdownPool();
  portal?.stop();
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "record failed");
    process.exitCode = 1;
  });
}
