import { HOSTED_BLOCKED } from "../shared/copy.ts";
import { tokensPerSecLabel } from "../shared/metrics.ts";
import type { AgentEvent, AgentResult, FilePreview, RunRequest } from "../shared/types.ts";
import { runMock } from "./agent.ts";
import { runLive } from "./adapter/local.ts";
import { modeReport, type PocketEnv } from "./env.ts";
import { resolveRoot } from "./roots.ts";
import { filesQuery, runBody } from "./schema.ts";
import { executeTool, listPocket } from "./tools.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function* blocked(env: PocketEnv, root: string): AsyncGenerator<AgentEvent> {
  const files = await listPocket(root);
  const result: AgentResult = {
    trace: [],
    files,
    summaryPath: null,
    summaryMarkdown: null,
    ttftMs: null,
    tokensPerSec: null,
    tokensPerSecLabel: tokensPerSecLabel(null),
    usage: null,
    turns: 0,
    wallMs: null,
    source: "live",
    endpointHost: env.endpointHost,
    offline: false,
    model: env.model,
    message: HOSTED_BLOCKED,
    recorded: false,
  };
  yield { type: "files", files };
  yield { type: "result", result };
}

function streamEvents(events: AsyncGenerator<AgentEvent>, delayMs: number): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          if (event.type === "trace" && delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "run failed";
        const event: AgentEvent = { type: "error", message };
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function preview(root: string, filePath: string): Promise<FilePreview> {
  const files = await listPocket(root);
  const file = files.find((item) => item.path === filePath);
  if (!file) throw new Error("file is not in the sandbox");
  const outcome = await executeTool(root, "read_file", { path: filePath });
  if (!outcome.ok) throw new Error(outcome.excerpt);
  return {
    path: file.path,
    kind: file.kind,
    mime: file.mime,
    tags: file.tags,
    text: outcome.image ? null : outcome.modelText,
    dataUrl: outcome.image ? `data:${outcome.image.mime};base64,${outcome.image.base64}` : null,
  };
}

export function createApp(env: PocketEnv) {
  return {
    async handle(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/api/mode") {
        return json(modeReport(env));
      }

      if (request.method === "GET" && (url.pathname === "/api/files" || url.pathname === "/api/file")) {
        const parsed = filesQuery.safeParse({
          rootId: url.searchParams.get("rootId"),
          customPath: url.searchParams.get("customPath") ?? undefined,
          path: url.searchParams.get("path") ?? undefined,
        });
        if (!parsed.success) return json({ error: "invalid file query" }, 400);
        try {
          const root = await resolveRoot(parsed.data.rootId, parsed.data.customPath);
          if (url.pathname === "/api/file") {
            if (!parsed.data.path) return json({ error: "path is required" }, 400);
            return json(await preview(root, parsed.data.path));
          }
          return json({ files: await listPocket(root) });
        } catch (error) {
          const message = error instanceof Error ? error.message : "folder failed";
          return json({ error: message }, 400);
        }
      }

      if (request.method === "POST" && url.pathname === "/api/run") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid JSON" }, 400);
        }
        const parsed = runBody.safeParse(body);
        if (!parsed.success) return json({ error: "invalid run" }, 400);
        const run: RunRequest = parsed.data;
        try {
          const root = await resolveRoot(run.rootId, run.customPath);
          if (env.mode === "hosted-blocked") return streamEvents(blocked(env, root), 0);
          if (env.mode === "mock") {
            return streamEvents(
              runMock({
                root,
                rootId: run.rootId,
                model: env.model,
                delayMs: env.streamDelayMs,
              }),
              0,
            );
          }
          if (env.mode === "live") {
            return streamEvents(runLive({ root, env }), 0);
          }
          const neverMode: never = env.mode;
          return json({ error: `unknown mode ${neverMode}` }, 500);
        } catch (error) {
          const message = error instanceof Error ? error.message : "run failed";
          return json({ error: message }, 400);
        }
      }

      return json({ error: "not found" }, 404);
    },
  };
}
