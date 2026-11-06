# Async Subagent Desk: PLAN

Sources (read 2026-11-06):
- [LangChain launch post](https://x.com/LangChain/status/2118438264009114101) (2026-11-05): revamped async subagent support in Deep Agents.
- [JS docs: Async subagents](https://docs.langchain.com/oss/javascript/deepagents/async-subagents)
- [Reference app: langchain-ai/async-deep-agents](https://github.com/langchain-ai/async-deep-agents) (three-graph layout; its TS example uses stale option/type names, so `deepagents@1.16.2` types + current docs win).
- npm `deepagents@1.16.2` type declarations via jsDelivr, and registry publish times for the pinned dependency set.

## Goal
A one-screen chat desk: a lead agent starts background **research** and **coder** subagents, keeps answering the user while they run, and shows live task cards with start / check / follow-up / cancel. The interaction is the demo: no blocked chat, no polling spinner taking over the conversation.

## Verified API facts (deepagents JS, not Python managed agents)
- Package: `deepagents`; stable async support since `1.9.0`, revamped features (`updateStrategy`, `notifyParent`, `webhook`, `waiting`, `mode: fork`) in `>=1.16.0`. Pin **`deepagents@1.16.2`** (published 2026-10-30, satisfies the repo's 3-day release-age gate).
- Async subagent spec:
  ```ts
  import { createDeepAgent, type AsyncSubAgent } from "deepagents";
  const researcher: AsyncSubAgent = {
    name: "researcher",
    description: "Researches a question in the background",
    graphId: "researcher", // must match langgraph.ts.json
    updateStrategy: "interrupt", // or "enqueue"
  };
  const agent = createDeepAgent({
    model: "anthropic:claude-sonnet-5",
    systemPrompt: SUPERVISOR_PROMPT,
    subagents: [researcher, coder],
    checkpointer,
  });
  ```
  `graphId` is what marks a subagent async. The stale example's top-level `asyncSubagents` option and `AsyncSubagent` casing are not used.
- Tools supplied by the middleware: `start_async_task`, `check_async_task`, `update_async_task`, `cancel_async_task`, `list_async_tasks`. Start returns a task/thread id immediately; check returns live status + result; update sends a follow-up to the same thread; cancel calls `runs.cancel()`.
- Statuses: `pending | running | waiting | success | error | cancelled | timeout | interrupted`.
- Required behavior: after starting, the supervisor returns control to the user; it never busy-polls. Check/list are called again when the user asks because history is stale. `asyncTasks` is a dedicated state channel that survives compaction.
- Real async runs are **remote graph runs on an Agent Protocol server** (LangGraph Agent Server / LangSmith), not in-process Promises. `langgraph dev --n-jobs-per-worker 10` runs the co-deployed supervisor + researcher + coder graphs locally. This is required for live concurrency, cancel and mid-flight updates.
- Sync `task`-tool subagents and `stream.subagents` are NOT this feature and must not be presented as async subagents.

### Age-compliant pins (bunfig minimumReleaseAge = 259200)
`deepagents@1.16.2`, `langchain@1.6.0`, `@langchain/core@1.3.3`, `@langchain/langgraph@1.6.0`, `@langchain/langgraph-sdk@1.12.9`, `@langchain/langgraph-checkpoint@1.2.2`, `@langchain/langgraph-cli@1.5.7`, `langsmith@0.11.7`. Newer langchain/core/langgraph/langsmith releases are under 3 days old and cannot install. `deepagents` declares `langsmith <0.10` while `langchain@1.6.0` wants `>=0.11`; prefer 0.11.7 and document any peer warning. If Bun hard-fails peer resolution, stop and report; do not silently disable the repo rule.

## Single-user MVP
In:
- **Chat pane** with streaming supervisor replies and visible tool-call chips for the five async tools. Three seeded prompts: competitive research brief, small code task, and a combined request that starts both while the user keeps asking questions.
- **Task cards** beside the chat: agent (researcher/coder), description, task id, live status, elapsed time, last update, result on success. Buttons: Check now, Send follow-up, Cancel. Status refreshes via desk polling for the UI only; the agent itself never poll-loops.
- **Mid-flight follow-up** composer per card, demonstrating `update_async_task` with `updateStrategy: "interrupt"`.
- **The unblock moment**: after starting a task the user can immediately ask an unrelated question and get an answer while the card stays `running`. This is the central shot of the video.
- **Two clearly separated modes:**
  - **Live** (`LANGGRAPH_API_URL` + a model key): real `deepagents` supervisor and Agent Server graphs. Model/provider selectable from env, e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY`; never hardcode or expose keys to the browser.
  - **Mock (default, no keys)**: deterministic scripted supervisor + timed background jobs exposing the same five-tool semantics and status transitions, clearly badged "Simulated run — no model calls". The real deepagents code remains in the repo and is exactly what `bun run agent-server` starts. Mock results are canned and labelled; never claim they came from LangChain or a model.
- **Mode banner** explaining live mode needs an Agent Server and model key, with exact commands.
- **Run:** `cd apps/async-subagent-desk && bun install && bun run dev` (mock desk). Live: `bun run agent-server` then `bun run dev -- --live` or documented env equivalent.

Out: auth, multi-user, persistence across server restarts for the mock, LangSmith tracing UI, webhooks, fork mode, real web search/code execution guarantees in mock, deployment, managed Python agents.

## Architecture
```
Vite + React + shadcn desk
  ChatPane ──▶ POST /api/chat (SSE) ──▶ server/chat.ts
  TaskCards ─▶ GET /api/tasks ────────▶ server/tasks.ts
             ─▶ POST /api/tasks/:id/{check,update,cancel}

server/
  backend/live.ts   LangGraph SDK client to LANGGRAPH_API_URL; streams supervisor
                    events and exposes task operations for the five async tools.
  backend/mock.ts   deterministic scripted supervisor + timers; same interface,
                    same statuses, labelled synthetic.
  prompts.ts        supervisor rules: start → return control; check on demand only.
graphs/ (live path, mirrors official three-graph layout)
  supervisor.ts     createDeepAgent + AsyncSubAgent researcher/coder
  researcher.ts     background research graph
  coder.ts          background coder graph
langgraph.ts.json   co-deployed graph ids: agent, researcher, coder
```
One backend interface drives both modes so the cards and chat behavior are identical in shape. Keep the live path thin; do not build a custom orchestrator and call it deepagents.

## Stack (one line each)
- **Bun**: repo standard for install, scripts, tests and HTTP API.
- **Vite + React + TS** (`bunx create-vite`, skip install): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, ScrollArea, Textarea, Tabs, Tooltip, Sonner on demand.
- **deepagents 1.16.2 + LangGraph SDK (pinned)**: the actual async subagent feature under demo.
- **langgraph-cli (dev script only)**: official local Agent Server for real concurrency.

## Tasks (vertical slices)
1. Scaffold app + `bunfig.toml` before install; pin dependency set; prove install/build.
2. Implement backend interface and mock backend; deterministic chat + task lifecycle tests (start → running → success, follow-up, cancel, stale-check rule).
3. Build chat pane + task cards + follow-up/cancel controls and mode banner; the unblock moment works end to end.
4. Implement live deepagents graphs, SDK backend and `agent-server` script; typecheck them even without keys. Document exact live setup and any unverified runtime pieces honestly.
5. Validate production build and tests; capture screenshot + video of the running mock desk showing both background tasks and uninterrupted chat. If live credentials are available in the environment, also verify live and report it; otherwise state live is untested.

## Deferred
Managed Deep Agents on LangSmith, webhooks/notifications, fork mode, real search/tools in mock, deployment, a general-purpose agent builder UI.

## Post notes
Honest framing: built on LangChain Deep Agents async subagents; video uses simulated runs if no model key/Agent Server was available. Tag verified `@LangChain`; other handles only after verification, max 3.

## Implementation notes (2026-11-06)

Verified while building. These correct the plan where the install or the JS CLI differed from the snippet.

- Bun 1.4.4 did **not** hard-fail the `langsmith` peer clash. Top-level pin stayed `langsmith@0.11.7` (`langchain@1.6.0` wants `>=0.11`). `deepagents@1.16.2` still declares `langsmith >=0.7.1 <0.10`. `@langchain/langgraph-cli@1.5.7` nested its own `langsmith@0.10.13`. `bunfig.toml` `minimumReleaseAge` was not weakened or bypassed.
- `shadcn init` preset name on this CLI is `nova` (not `base-nova`). `components.json` still records `"style": "base-nova"`.
- The JS binary is `langgraphjs`. `langgraphjs dev --n-jobs-per-worker` defaults to 10; the `agent-server` script passes 10 anyway. Config file is `langgraph.ts.json` with graph ids `agent`, `researcher`, `coder`.
- Exported graphs call `createDeepAgent` and omit `checkpointer`. The Agent Server injects persistence; a local checkpointer would fight that. The snippet above includes `checkpointer` only as the API shape.
- Live card buttons call the LangGraph SDK (`runs.get`, `runs.create` with `multitaskStrategy: "interrupt"`, `runs.cancel`). Chat streams the supervisor so the five tool names show up when the model calls them. The desk does not pretend a synchronous `task` subagent is async.
- Provider packages are optional peers and are not installed. A live model call needs `@langchain/anthropic`, `@langchain/openai`, or the Google package that matches `DEEP_AGENT_MODEL`. Graph modules import and typecheck without a key.
