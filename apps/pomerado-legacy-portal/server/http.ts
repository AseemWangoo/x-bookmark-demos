import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AskResponse, CallResult } from "../src/lib/types.ts";
import { detectMode, portalCreds, portalUrl, secondsPerStep } from "./env.ts";
import { newIdempotencyKey } from "./jobs.ts";
import { createVendorOnPortal, resetPortalHttp } from "./portal-sync.ts";
import { replayAddVendor, replayListInvoices, replayListVendors, replayRecordedAt, resetReplay } from "./replay.ts";
import { routeText, type VendorInput } from "./router.ts";
import { askBody, callBody } from "./schema.ts";

export const appRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

async function modeReport() {
  return detectMode(appRoot, replayRecordedAt());
}

async function executeRead(
  integration: "list_invoices" | "list_vendors",
  input: Record<string, unknown>,
): Promise<CallResult> {
  const mode = await modeReport();
  if (mode.mode === "replay") {
    if (integration === "list_invoices") {
      return replayListInvoices({
        ...(typeof input.status === "string" ? { status: input.status } : {}),
        ...(typeof input.vendor === "string" ? { vendor: input.vendor } : {}),
      });
    }
    return replayListVendors();
  }
  const client = await import("./pomerado-client.ts");
  return client.callIntegration(appRoot, integration, input, "read");
}

async function executeAdd(input: VendorInput, idempotencyKey: string): Promise<CallResult> {
  const mode = await modeReport();
  if (mode.mode === "local") {
    const client = await import("./pomerado-client.ts");
    return client.callIntegration(appRoot, "add_vendor", { ...input }, "write", idempotencyKey);
  }
  if (process.env.VERCEL !== "1") {
    const synced = await createVendorOnPortal(portalUrl(), input, portalCreds());
    if ("error" in synced) {
      return {
        integration: "add_vendor",
        arguments: { input, idempotency_key: idempotencyKey },
        trail: ["replay"],
        output: null,
        error: `Portal rejected the vendor: ${synced.error}`,
        possibleCommit: false,
        ms: 0,
        cold: false,
        coldMs: null,
        warmMs: null,
        latencyLabel: "recorded",
        synthetic: mode.synthetic,
        recordedAt: mode.recordedAt,
      };
    }
    return replayAddVendor(input, idempotencyKey, synced.id);
  }
  return replayAddVendor(input, idempotencyKey);
}

export async function handleMode(): Promise<Response> {
  return json(await modeReport());
}

export async function handleAsk(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const parsed = askBody.safeParse(body);
  if (!parsed.success) return json({ error: "text is required" }, 400);
  const route = routeText(parsed.data.text);
  const stepSeconds = secondsPerStep();
  if (route.kind === "help") {
    const response: AskResponse = { kind: "help", message: route.message, secondsPerStep: stepSeconds };
    return json(response);
  }
  if (route.kind === "needs-confirm") {
    const response: AskResponse = {
      kind: "needs-confirm",
      integration: "add_vendor",
      input: route.input,
      secondsPerStep: stepSeconds,
    };
    return json(response);
  }
  try {
    const result = await executeRead(route.integration, route.input);
    const response: AskResponse = {
      kind: "call",
      integration: route.integration,
      input: route.input,
      result,
      secondsPerStep: stepSeconds,
    };
    return json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "call failed";
    return json({ error: message }, 500);
  }
}

export async function handleCall(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const parsed = callBody.safeParse(body);
  if (!parsed.success) return json({ error: "invalid add_vendor call" }, 400);
  const key = parsed.data.idempotency_key ?? newIdempotencyKey();
  try {
    const result = await executeAdd(parsed.data.input, key);
    return json({ result, secondsPerStep: secondsPerStep() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "call failed";
    return json({ error: message }, 500);
  }
}

export async function handleReset(): Promise<Response> {
  resetReplay();
  if (process.env.VERCEL === "1") return json({ ok: true, portal: false });
  try {
    await resetPortalHttp(portalUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "reset failed";
    return json({ ok: false, error: message }, 502);
  }
  return json({ ok: true, portal: true });
}
