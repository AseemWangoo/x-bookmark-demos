import type { IncomingMessage, ServerResponse } from "node:http";
import OpenAI from "openai";
import type { Plugin, ViteDevServer } from "vite";
import { loadEnv } from "vite";

type LibraryModule = {
  library: {
    prompt: (options: {
      preamble?: string;
      additionalRules?: string[];
      examples?: string[];
      toolCalls?: boolean;
      bindings?: boolean;
      builtinFunctions?: boolean;
    }) => string;
  };
};

type FixtureModule = {
  jaipurOpenUI: string;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function envValue(env: Record<string, string>, name: string): string {
  return env[name] || process.env[name] || "";
}

async function systemPrompt(server: ViteDevServer): Promise<string> {
  const libraryModule = (await server.ssrLoadModule(
    "/src/genui/library.tsx",
  )) as LibraryModule;
  const fixtureModule = (await server.ssrLoadModule(
    "/src/genui/fixtures/jaipur.oui.ts",
  )) as FixtureModule;

  return libraryModule.library.prompt({
    preamble:
      "You are a trip planner that responds using openui-lang, a declarative UI language. Your ENTIRE response must be valid openui-lang code — no markdown, no explanations, just openui-lang. Plan exactly the city and day count the user asked for.",
    additionalRules: [
      "Use the Jaipur example as the shape, then swap the city, day count, places, and amounts.",
      "Pick a real currency for the city. Indian cities use INR.",
      "BookTrip total must equal the sum of the budget amounts.",
    ],
    examples: [fixtureModule.jaipurOpenUI],
    toolCalls: false,
    bindings: false,
    builtinFunctions: false,
  });
}

async function handleChat(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>,
) {
  const apiKey = envValue(env, "OPENAI_API_KEY");
  if (!apiKey) {
    res.statusCode = 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Live mode is off. Set OPENAI_API_KEY.");
    return;
  }

  let message = "";
  try {
    const parsed = JSON.parse(await readBody(req)) as { message?: unknown };
    if (typeof parsed.message === "string") message = parsed.message.trim();
  } catch {
    res.statusCode = 400;
    res.end("Expected a JSON body with message.");
    return;
  }

  if (!message) {
    res.statusCode = 400;
    res.end("message is required.");
    return;
  }

  const baseURL = envValue(env, "OPENAI_BASE_URL") || undefined;
  const model = envValue(env, "OPENAI_MODEL") || "gpt-4o-mini";
  const client = new OpenAI({ apiKey, baseURL });
  const prompt = await systemPrompt(server);

  res.statusCode = 200;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-cache");

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: message },
    ],
  });

  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content ?? "";
    if (delta) res.write(delta);
  }
  res.end();
}

export function chatPlugin(): Plugin {
  return {
    name: "openui-trip-chat",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path !== "/api/mode" && path !== "/api/chat") {
          next();
          return;
        }

        void (async () => {
          const env = loadEnv(server.config.mode, server.config.envDir, "");
          const live = envValue(env, "OPENAI_API_KEY").length > 0;

          if (path === "/api/mode") {
            if (req.method !== "GET") {
              sendJson(res, 405, { error: "Use GET." });
              return;
            }
            sendJson(res, 200, { mode: live ? "live" : "mock" });
            return;
          }

          if (req.method !== "POST") {
            sendJson(res, 405, { error: "Use POST." });
            return;
          }

          await handleChat(server, req, res, env);
        })().catch((error: unknown) => {
          console.error(error);
          if (res.headersSent) {
            res.end();
            return;
          }
          res.statusCode = 500;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("Live model request failed.");
        });
      });
    },
  };
}
