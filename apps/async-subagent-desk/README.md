# Async Subagent Desk

A one-screen desk for LangChain Deep Agents async subagents. The lead agent starts a researcher and a coder in the background, then keeps answering while those tasks run. Task cards support Check now, Send follow-up, and Cancel.

Source bookmark: [LangChain async subagents](https://x.com/LangChain/status/2118438264009114101).

## Run

```bash
cd apps/async-subagent-desk
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No model key is required. The desk starts in **simulated** mode. The badge says **Simulated run — no model calls**. Replies and task results are canned scripts. They are not model output and they are not LangChain output.

## What the desk shows

Async subagents are remote graph runs. `graphId` on an `AsyncSubAgent` is what marks the subagent async (`deepagents@1.16.2`). The supervisor gets five tools:

- `start_async_task`
- `check_async_task`
- `update_async_task`
- `cancel_async_task`
- `list_async_tasks`

Statuses: `pending`, `running`, `waiting`, `success`, `error`, `cancelled`, `timeout`, `interrupted`.

The lead agent returns after a launch. It does not poll. The cards poll so you can see status without asking. The synchronous `task` tool is a different feature and is not shown as an async subagent.

Seeded prompts: a research brief, a small code task, and a combined request. After the combined request, ask something else (try `What's 17 * 23?`) while the cards are still running.

In the simulation, the researcher finishes in about 16 seconds and the coder in about 3 minutes, so you can still cancel or follow up after the research result lands. A follow-up resets that task for about 8 seconds. Launch spends the first 400ms in `pending`.

## Live mode

Live mode is the real `createDeepAgent` path. It is untested here without a model key and a running Agent Server.

```bash
# terminal 1 — LangGraph Agent Server, three graphs
bun run agent-server

# terminal 2 — desk pointed at that server
LANGGRAPH_API_URL=http://127.0.0.1:2024 bun run dev -- --live
```

`bun run agent-server` is `langgraphjs dev --config langgraph.ts.json --port 2024 --n-jobs-per-worker 10`. Graphs: `agent` (supervisor), `researcher`, `coder`. The exported graphs do not pass a checkpointer; the Agent Server persists runs.

Set one model key in that environment: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`. Override the model string with `DEEP_AGENT_MODEL` (default `anthropic:claude-sonnet-5`, `openai:gpt-5.5`, or `google:gemini-3.6-flash`). The provider package for that prefix is not installed in this demo; a live run needs it (optional peers `@langchain/anthropic` or `@langchain/openai`, or the Google package). Keys stay on the server.

`MOCK=1` forces the simulation even if a key and URL are set.

Card buttons in live mode call the LangGraph SDK (`runs.get`, `runs.create` with `multitaskStrategy: "interrupt"`, `runs.cancel`). That is the same Agent Server surface the five tools use. Chat streams the supervisor, and tool chips appear when the model calls those tools.

## Pins

`deepagents@1.16.2`, `langchain@1.6.0`, `@langchain/core@1.3.3`, `@langchain/langgraph@1.6.0`, `@langchain/langgraph-sdk@1.12.9`, `@langchain/langgraph-checkpoint@1.2.2`, `@langchain/langgraph-cli@1.5.7`, `langsmith@0.11.7`.

`deepagents@1.16.2` peers `langsmith <0.10` while `langchain@1.6.0` depends on `langsmith >=0.11`. Bun 1.4.4 installed `langsmith@0.11.7` at the top level and nested `langsmith@0.10.13` under the CLI. It did not hard-fail. `bunfig.toml` still has `minimumReleaseAge = 259200`.

## Scripts

```bash
bun test
bun run build
```
