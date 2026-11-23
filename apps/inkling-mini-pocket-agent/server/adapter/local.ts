import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";

import { SUMMARY_FILENAME, TURN_CAP } from "../../shared/copy.ts";
import { tokensPerSec, tokensPerSecLabel } from "../../shared/metrics.ts";
import type { AgentEvent, AgentResult, TraceEntry, Usage } from "../../shared/types.ts";
import { assertLoopbackTarget, parseToolArguments } from "../agent.ts";
import type { PocketEnv } from "../env.ts";
import { isLoopbackBaseUrl } from "../env.ts";
import { executeTool, isToolName, listPocket } from "../tools.ts";
import type { ToolOutcome } from "../tools.ts";

const SYSTEM = [
  "You are a private pocket agent for one local folder.",
  "Use only the provided tools. They are already sandboxed.",
  "Do not request a shell, a network call, or a delete.",
  "Call list_files, read_file on each note and receipt, tag_file for each file, then write_summary.",
  `write_summary stores ${SUMMARY_FILENAME} and nothing else.`,
  "Stop after write_summary succeeds.",
].join(" ");

export function pocketTools(): ChatCompletionTool[] {
  return [
    {
      type: "function",
      function: {
        name: "list_files",
        description: "List files in the sandboxed folder. Optional glob such as *.md.",
        parameters: {
          type: "object",
          properties: { glob: { type: "string" } },
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read a UTF-8 text file, or an image receipt as an image part.",
        parameters: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "tag_file",
        description: "Attach lowercase tags. Stored in .pocket/tags.json. Does not rewrite the file.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
          required: ["path", "tags"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "write_summary",
        description: `Write or overwrite only ${SUMMARY_FILENAME} inside the sandbox.`,
        parameters: {
          type: "object",
          properties: { markdown: { type: "string" } },
          required: ["markdown"],
          additionalProperties: false,
        },
      },
    },
  ];
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function createLoopbackFetch(inner: typeof fetch): typeof fetch {
  const wrapped = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const href = requestUrl(input);
    if (!isLoopbackBaseUrl(href)) {
      throw new Error("refusing non-loopback chat completion");
    }
    const response = await inner(input, { ...init, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      throw new Error("refusing redirect off loopback");
    }
    return response;
  };
  return wrapped as typeof fetch;
}

type DeltaExtra = {
  reasoning_content?: string | null;
  thinking?: string | null;
};

type ToolAcc = { id: string; name: string; arguments: string };

function hasSignal(delta: ChatCompletionChunk.Choice.Delta, extra: DeltaExtra): boolean {
  if (delta.content) return true;
  if (extra.reasoning_content) return true;
  if (extra.thinking) return true;
  return Boolean(
    delta.tool_calls?.some((call) => call.id || call.function?.name || call.function?.arguments),
  );
}

function toolMessage(id: string, outcome: ToolOutcome): ChatCompletionToolMessageParam {
  if (!outcome.image) {
    return { role: "tool", tool_call_id: id, content: outcome.modelText };
  }
  // The pinned SDK types tool content as text. Inkling's chat template also
  // accepts image parts on tool messages, so the image part is asserted here.
  const message = {
    role: "tool" as const,
    tool_call_id: id,
    content: [
      { type: "text" as const, text: outcome.modelText },
      {
        type: "image_url" as const,
        image_url: { url: `data:${outcome.image.mime};base64,${outcome.image.base64}` },
      },
    ],
  };
  return message as ChatCompletionToolMessageParam;
}

export async function* runLive(input: {
  root: string;
  env: PocketEnv;
  fetchImpl?: typeof fetch;
}): AsyncGenerator<AgentEvent> {
  assertLoopbackTarget(input.env);
  const baseUrl = input.env.baseUrl;
  if (!baseUrl) throw new Error("missing loopback base URL");

  const client = new OpenAI({
    baseURL: baseUrl,
    apiKey: input.env.apiKey,
    fetch: createLoopbackFetch(input.fetchImpl ?? fetch),
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: "Inventory the folder, read each file, tag it, and write the pocket summary.",
    },
  ];

  const started = performance.now();
  let ttftMs: number | null = null;
  let usage: Usage | null = { inputTokens: 0, outputTokens: 0 };
  const trace: TraceEntry[] = [];
  let summary: { path: string; markdown: string } | null = null;
  let turns = 0;

  for (let turn = 1; turn <= TURN_CAP; turn += 1) {
    turns = turn;
    const stream = await client.chat.completions.create({
      model: input.env.model,
      messages,
      tools: pocketTools(),
      stream: true,
      stream_options: { include_usage: true },
      reasoning_effort: input.env.reasoningEffort,
    });

    let content = "";
    const calls = new Map<number, ToolAcc>();
    let sawTool = false;
    let turnUsage: Usage | null = null;

    for await (const chunk of stream) {
      if (chunk.usage) {
        turnUsage = {
          inputTokens: chunk.usage.prompt_tokens ?? 0,
          outputTokens: chunk.usage.completion_tokens ?? 0,
        };
      }
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;
      const extra = delta as DeltaExtra;
      if (ttftMs == null && hasSignal(delta, extra)) {
        ttftMs = Math.round(performance.now() - started);
      }
      if (delta.content) content += delta.content;
      for (const call of delta.tool_calls ?? []) {
        sawTool = true;
        const current = calls.get(call.index) ?? { id: "", name: "", arguments: "" };
        if (call.id) current.id = call.id;
        if (call.function?.name) current.name += call.function.name;
        if (call.function?.arguments) current.arguments += call.function.arguments;
        calls.set(call.index, current);
      }
    }

    if (usage && turnUsage) {
      usage = {
        inputTokens: usage.inputTokens + turnUsage.inputTokens,
        outputTokens: usage.outputTokens + turnUsage.outputTokens,
      };
    } else {
      usage = null;
    }

    if (!sawTool) break;

    const ordered = [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([, call]) => call);
    messages.push({
      role: "assistant",
      content: content || null,
      tool_calls: ordered.map((call, index) => ({
        id: call.id || `call_${turn}_${index}`,
        type: "function" as const,
        function: { name: call.name, arguments: call.arguments },
      })),
    });

    let wrote = false;
    for (const [index, call] of ordered.entries()) {
      const id = call.id || `call_${turn}_${index}`;
      const toolStarted = performance.now();
      let args: Record<string, unknown> = {};
      let outcome: ToolOutcome;
      let name: TraceEntry["name"] = "rejected";
      try {
        args = parseToolArguments(call.arguments);
        if (!isToolName(call.name)) {
          outcome = {
            ok: false,
            excerpt: `rejected unknown tool ${call.name || "(blank)"}`,
            modelText: JSON.stringify({ error: "unknown tool" }),
            highlightPath: null,
            summary: null,
          };
        } else {
          name = call.name;
          outcome = await executeTool(input.root, call.name, args);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "tool arguments were not JSON";
        outcome = {
          ok: false,
          excerpt: message,
          modelText: JSON.stringify({ error: message }),
          highlightPath: null,
          summary: null,
        };
      }
      const entry: TraceEntry = {
        id,
        name,
        args,
        resultExcerpt: outcome.excerpt,
        durationMs: Math.max(1, Math.round(performance.now() - toolStarted)),
        highlightPath: outcome.highlightPath,
      };
      trace.push(entry);
      yield { type: "trace", entry };
      if (outcome.summary) {
        summary = outcome.summary;
        wrote = true;
        yield { type: "summary", path: outcome.summary.path, markdown: outcome.summary.markdown };
      }
      yield { type: "files", files: await listPocket(input.root) };
      messages.push(toolMessage(id, outcome));
    }
    if (wrote) break;
  }

  const wallMs = Math.round(performance.now() - started);
  const rate = tokensPerSec({
    completionTokens: usage?.outputTokens ?? null,
    ttftMs,
    wallMs,
  });
  const files = await listPocket(input.root);
  let message: string | null = null;
  if (!summary) {
    message = turns >= TURN_CAP ? `Turn cap (${TURN_CAP}) reached before write_summary.` : "Model finished without write_summary.";
  }
  const result: AgentResult = {
    trace,
    files,
    summaryPath: summary?.path ?? null,
    summaryMarkdown: summary?.markdown ?? null,
    ttftMs,
    tokensPerSec: rate,
    tokensPerSecLabel: tokensPerSecLabel(rate),
    usage,
    turns,
    wallMs,
    source: "live",
    endpointHost: input.env.endpointHost,
    offline: true,
    model: input.env.model,
    message,
    recorded: false,
  };
  yield { type: "result", result };
}
