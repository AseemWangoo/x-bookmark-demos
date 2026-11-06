import { ASYNC_TOOL_NAMES, SIMULATED_BANNER } from "../shared/desk.ts";
import { LIVE_SETUP } from "./mode.ts";
import { DeskError, type DeskBackend } from "./backend/types.ts";

export type ServerEvent =
  | { type: "meta"; mode: "mock" | "live"; simulated: boolean; threadId: string }
  | { type: "token"; text: string }
  | {
      type: "tool";
      name: string;
      args: Record<string, string>;
      result: string;
    }
  | { type: "done" }
  | { type: "error"; message: string };

export function createApp(backend: DeskBackend) {
  return {
    handle(request: Request): Promise<Response> {
      return handle(request, backend);
    },
  };
}

async function handle(request: Request, backend: DeskBackend): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/api/mode") {
    return json(modePayload(backend));
  }

  if (request.method === "GET" && pathname === "/api/tasks") {
    return json(await backend.listTasks());
  }

  if (request.method === "POST" && pathname === "/api/chat") {
    return chat(request, backend);
  }

  const action = /^\/api\/tasks\/([^/]+)\/(check|update|cancel)$/.exec(pathname);
  if (request.method === "POST" && action) {
    const taskId = decodeURIComponent(action[1] ?? "");
    const kind = action[2];
    try {
      if (kind === "check") return json(await backend.check(taskId));
      if (kind === "cancel") return json(await backend.cancel(taskId));
      const body = await readJson(request);
      const message = typeof body.message === "string" ? body.message : "";
      return json(await backend.update(taskId, message));
    } catch (error) {
      return errorResponse(error);
    }
  }

  return json({ error: "Not found." }, 404);
}

function modePayload(backend: DeskBackend) {
  return {
    mode: backend.mode,
    simulated: backend.simulated,
    banner: backend.simulated ? SIMULATED_BANNER : "Live Agent Server",
    detail: backend.simulated
      ? "Background jobs are timed scripts with the same status machine as the five async tools. Nothing in this mode is model or LangChain output."
      : "The lead agent is the co-deployed deepagents supervisor. Card buttons call the Agent Server directly (check, interrupt follow-up, cancel). The agent itself does not poll.",
    commands: LIVE_SETUP,
    tools: ASYNC_TOOL_NAMES,
  };
}

async function chat(request: Request, backend: DeskBackend): Promise<Response> {
  let message = "";
  let threadId: string | undefined;
  try {
    const body = await readJson(request);
    message = typeof body.message === "string" ? body.message : "";
    threadId = typeof body.threadId === "string" ? body.threadId : undefined;
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ServerEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        const result = await backend.chat({ message, threadId }, async (event) => {
          if (event.type === "token") send({ type: "token", text: event.text });
          if (event.type === "tool") {
            send({
              type: "tool",
              name: event.tool.name,
              args: event.tool.args,
              result: event.tool.result,
            });
          }
        });
        send({
          type: "meta",
          mode: backend.mode,
          simulated: backend.simulated,
          threadId: result.threadId,
        });
        send({ type: "done" });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Chat failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new DeskError(400, "Expected a JSON object.");
  }
  return body as Record<string, unknown>;
}

function errorResponse(error: unknown): Response {
  if (error instanceof DeskError) return json({ error: error.message }, error.status);
  const message = error instanceof Error ? error.message : "Request failed.";
  return json({ error: message }, 500);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
