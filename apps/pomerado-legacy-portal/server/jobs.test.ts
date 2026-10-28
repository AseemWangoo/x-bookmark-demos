import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { expect, test } from "bun:test";
import { decideMintAnswer, followJob, newIdempotencyKey } from "./jobs.ts";
import { runToolCall, unwrapToolResult } from "./pomerado-client.ts";

interface Scripted {
  calls: { name: string; args: Record<string, unknown> }[];
}

function toolResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

async function fakeServer(handler: (name: string, args: Record<string, unknown>, script: Scripted) => Record<string, unknown>) {
  const script: Scripted = { calls: [] };
  const server = new Server({ name: "fake-pomerado", version: "0.0.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    script.calls.push({ name, args });
    return toolResult(handler(name, args, script));
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  return {
    script,
    caller: {
      async call(name: string, args: Record<string, unknown>) {
        const result = await client.callTool({ name, arguments: args });
        return unwrapToolResult(result);
      },
    },
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

const creds = { username: "clerk", password: "legacy123" };

test("immediate structured content", async () => {
  const fake = await fakeServer(() => ({ invoices: [{ invoiceNumber: "INV-1001" }] }));
  const result = await runToolCall(fake.caller, {
    integration: "list_invoices",
    input: { status: "overdue" },
    effect: "read",
    credentials: creds,
  });
  expect(result.output).toEqual({ invoices: [{ invoiceNumber: "INV-1001" }] });
  expect(result.trail).toEqual(["completed"]);
  expect(result.arguments.idempotency_key).toBeUndefined();
  await fake.close();
});

test("job then get_job then completed", async () => {
  const fake = await fakeServer((name) => {
    if (name === "list_vendors") return { job_id: "job-1", status: "running" };
    return { job_id: "job-1", status: "completed", output: { vendors: [] } };
  });
  const result = await runToolCall(fake.caller, {
    integration: "list_vendors",
    input: {},
    effect: "read",
    credentials: creds,
  });
  expect(result.output).toEqual({ vendors: [] });
  expect(fake.script.calls.map((call) => call.name)).toEqual(["list_vendors", "get_job"]);
  await fake.close();
});

test("credential question is answered with saveLogin false", async () => {
  const fake = await fakeServer((name) => {
    if (name === "list_invoices") {
      return {
        job_id: "job-2",
        status: "input_required",
        pending_input: {
          id: "req-1",
          questions: [{ id: "login", type: "credential", fields: "username_password", prompt: "Sign in" }],
        },
      };
    }
    if (name === "provide_input") return { job_id: "job-2", status: "running" };
    return { job_id: "job-2", status: "completed", output: { invoices: [] } };
  });
  const result = await runToolCall(fake.caller, {
    integration: "list_invoices",
    input: { status: "overdue" },
    effect: "read",
    credentials: creds,
  });
  const provided = fake.script.calls.find((call) => call.name === "provide_input");
  expect(provided?.args.answers).toEqual({
    login: { username: "clerk", password: "legacy123", saveLogin: false },
  });
  expect(result.trail.join(" → ")).toContain("answered with portal demo credentials");
  expect(result.error).toBeUndefined();
  await fake.close();
});

test("a non-login question is surfaced and not answered", async () => {
  const fake = await fakeServer(() => ({
    job_id: "job-3",
    status: "input_required",
    pending_input: {
      id: "req-2",
      questions: [{ id: "po", type: "text", prompt: "What is the PO number?" }],
    },
  }));
  const result = await runToolCall(fake.caller, {
    integration: "list_invoices",
    input: {},
    effect: "read",
    credentials: creds,
  });
  expect(result.error).toBe("Pomerado asked: What is the PO number?");
  expect(fake.script.calls.some((call) => call.name === "provide_input")).toBe(false);
  await fake.close();
});

test("writes send an idempotency key and a possible commit is not retried", async () => {
  const fake = await fakeServer((name) => {
    if (name === "add_vendor") {
      return {
        job_id: "job-4",
        status: "failed",
        possible_commit: true,
        error: "The confirm page timed out.",
      };
    }
    return { job_id: "job-4", status: "failed", possible_commit: true };
  });
  const key = newIdempotencyKey();
  const result = await runToolCall(fake.caller, {
    integration: "add_vendor",
    input: { name: "Globex Supply" },
    effect: "write",
    credentials: creds,
    idempotencyKey: key,
  });
  expect(result.arguments.idempotency_key).toBe(key);
  expect(key).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
  expect(result.possibleCommit).toBe(true);
  expect(result.error).toContain("list vendors to check");
  expect(fake.script.calls.filter((call) => call.name === "add_vendor")).toHaveLength(1);
  await fake.close();
});

test("mint refuses a switch to write", async () => {
  const question = {
    id: "effect",
    type: "confirm",
    prompt: "Switch the effect to write?",
  };
  const decision = decideMintAnswer(question, creds);
  expect(decision.ok).toBe(true);
  if (!decision.ok) return;
  expect(decision.value).toEqual({ confirmed: false });
  const fake = await fakeServer((name) => {
    if (name === "mint") {
      return {
        job_id: "job-5",
        status: "input_required",
        pending_input: { id: "req-5", questions: [question] },
      };
    }
    return { job_id: "job-5", status: "completed", output: { build: "published" } };
  });
  const exchange = await followJob(fake.caller, "mint", { name: "list_vendors" }, (item) =>
    decideMintAnswer(item, creds),
  );
  const provided = fake.script.calls.find((call) => call.name === "provide_input");
  expect(provided?.args.answers).toEqual({ effect: { confirmed: false } });
  expect(exchange.output).toEqual({ build: "published" });
  await fake.close();
});
