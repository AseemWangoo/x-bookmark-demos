# Inkling Mini Pocket Agent: PLAN

Sources (read 2026-11-23):

- [Introducing Inkling 2 Mini](https://thinkingmachines.ai/news/inkling-2-mini/) (launch blog, 2026-11-20)
- [Inkling 2 Mini Model Card](https://thinkingmachines.ai/model-card/inkling-2-mini/)
- [Hugging Face: thinkingmachines/Inkling-2-Mini](https://huggingface.co/thinkingmachines/Inkling-2-Mini) (weights + evals table, including AA Index v5.0 = 20.1)
- [chat_template.jinja](https://huggingface.co/thinkingmachines/Inkling-2-Mini/blob/main/chat_template.jinja)
- [Hugging Face blog: Welcome Inkling 2 Mini](https://huggingface.co/blog/inkling2mini) (2026-11-20; official `llama serve` commands)
- [ggml-org/Inkling-2-Mini-GGUF](https://huggingface.co/ggml-org/Inkling-2-Mini-GGUF)
- [thinkingmachines/TML-d24-varloop-research](https://huggingface.co/thinkingmachines/TML-d24-varloop-research) (research variable-loop sibling; not this demo's model)
- [Ollama library: inkling-2-mini](https://ollama.com/library/inkling-2-mini) and [tags](https://ollama.com/library/inkling-2-mini/tags)
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) and [Tool calling](https://docs.ollama.com/capabilities/tool-calling)
- [llama.cpp HTTP server README](https://github.com/ggml-org/llama.cpp/blob/HEAD/tools/server/README.md) (fetched 2026-11-23)
- [Tinker Models & Pricing](https://tinker-docs.thinkingmachines.ai/tinker/models/models_and_pricing/)
- [Tinker OpenAI-compatible API](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/) and [Chat Completions](https://tinker-docs.thinkingmachines.ai/inference/openai/chat-completions/)
- [Artificial Analysis article](https://artificialanalysis.ai/articles/inkling-2-mini) (2026-11-20; rounds the index to 20)
- Launch post: [@thinkymachines](https://x.com/thinkymachines/status/2123871643797995872) (2026-11-20 8:10 PM UTC / 2026-11-21 1:40 AM IST)
- Ollama GGUF-on-Windows issue [#19817](https://github.com/ollama/ollama/issues/19817) (updated 2026-11-22 8:52 PM UTC / 2026-11-23 2:22 AM IST)
- npm registry publish times for `openai` and the shared Vite/shadcn set (age gate = 3 days)

## Goal

A one-screen, **offline-first pocket agent** for a laptop: point it at a local folder of notes and receipts (or use the shipped fixtures), and **Inkling 2 Mini** sorts, summarizes, and tags the files through real tool calls (`list_files`, `read_file`, `tag_file`, `write_summary`) sandboxed to that folder. The desk shows a live **no-network / offline** badge (outbound LLM traffic is allowed only to localhost), **tokens/sec** and **TTFT**, and a **tool-call trace**. Recorded demo mode is the default so tests, the screenshot, and the video run without the 20 GB model.

This is a private local-folder agent, not Tinker Playground and not a hosted Inkling chat. Label recorded vs live honestly. Do not claim official AA Index, SWE-Bench, or "runs on any laptop" numbers in the UI.

## Verified model facts (Inkling 2 Mini)

### Names, architecture, and open weights

- Official product name: **Inkling 2 Mini**. Released **20 Nov 2026** by Thinking Machines Lab, Inc. Open weights under **Apache 2.0**.
- Architecture (model card and HF card): multimodal autoregressive **looped transformer**. 24-layer decoder-only MoE; the **middle 12 layers run three times** with shared weights, giving **48 layer applications per token** from 24 layers of weights. Each token is routed to **8 of 128** experts. Hybrid local/global attention. Native text + image input via a vision transformer; **text output**.
- Parameters (official): **26.4B total**, **3.4B active**. Each extra pass through the looped layers adds about **1.0B** effective active parameters; with three passes there are **5.4B effective active parameters per token**. Marketing often shortens this to "26B" / "5.4B active."
- Numerics: most weights trained and deployed in **NVFP4**, last four layers in **MXFP8**. Distributed as a **single ~20 GB** checkpoint.
- Context window: **up to 1M tokens** (official). Local servers often need a smaller `--ctx-size` / `num_ctx` in practice — do not imply the demo itself holds 1M tokens in RAM.
- Hardware (official): 1x NVIDIA DGX Spark; **Apple silicon with 32 GB or more** memory (MacBooks, Mac minis, Studios); other GPUs/platforms possible, **32 GB or more of VRAM recommended**. The launch blog's airplane-mode demo used a **MacBook Pro (M5 Pro, 48 GB)**. "Runs on a laptop" means a 32 GB+ machine, not a typical 16 GB one.
- Official Hugging Face repo: **`thinkingmachines/Inkling-2-Mini`**.
- A research **variable-loop** sibling is also released: **`thinkingmachines/TML-d24-varloop-research`** (GGUF: `ggml-org/TML-d24-varloop-research-GGUF`). It is for monitorability experiments, not this demo's default model.
- Benchmark claim: the [@thinkymachines launch post](https://x.com/thinkymachines/status/2123871643797995872) and the official HF/model-card evals table both report **20.1 on AA Index (v5.0)**. Artificial Analysis's own article rounds this to "at 20." Official coding scores on the same table include DeepSWE v1.1 **48.2%** and SWE-Bench Verified (bash only) **79.2%**. **Do not put these numbers in the UI.**

### Chat template, reasoning, and tool calling

- The official `chat_template.jinja` declares tools as a system `tool_declare` XML/JSON block, supports `reasoning_content`, image parts on user/tool messages, and maps `reasoning_effort` strings: `none` → 0.0, `minimal` → 0.1, `low` → 0.2, `medium` → 0.7, `high` → 0.9, `xhigh`/`max` → 0.99. Default when omitted: **0.9**. Numeric values must be in `[0.0, 0.99]`.
- The model card warns: **setting reasoning effort to its minimum does not fully disable reasoning**, because the middle layers still loop three times. It also warns that in agentic use the model may take destructive actions (delete/overwrite) without confirmation — this demo must sandbox tools and must not expose a delete tool.
- Tinker Chat Completions (hosted, documented for Inkling-family models): `tools` + tool-result `role: "tool"` messages; `finish_reason` is `"tool_calls"` when a call is returned; `reasoning_effort` accepted as the strings above or a float; streaming exposes `reasoning_content` separately from `content`. Recommend leaving `tool_choice` and `parallel_tool_calls` at defaults on Tinker. This path is **hosted**, so it must not light the offline badge.

### Local serving (the live path for this demo)

The app talks to **any OpenAI-compatible local** `/v1/chat/completions` endpoint with `tools`. Two first-party local stacks are documented:

**1. Ollama (official library model, Apple Silicon / MLX)**

- Command: `ollama run inkling-2-mini`
- Tags (all 20 GB, 1M context, text + image, same digest `d183b1321cb5` as of this plan): `inkling-2-mini` / `inkling-2-mini:latest`, `inkling-2-mini:26b-a5b`, `inkling-2-mini:26b-a5b-nvfp4` (tags page labels the last one MLX).
- OpenAI-compatible base: **`http://127.0.0.1:11434/v1`** (docs also write `http://localhost:11434/v1/`). The OpenAI SDK requires an `api_key` value; Ollama ignores it (docs use `"ollama"`).
- `/v1/chat/completions` supports **tools** and **`reasoning_effort`** (plus `reasoning` / `reasoning.effort`). `tool_choice` is documented as unsupported. Native tool-calling also works on `/api/chat`.
- **Platform caveat (verified 2026-11-23):** the official library model is **MLX**. An Ollama release note and issue [#19817](https://github.com/ollama/ollama/issues/19817) (last update 2026-11-22 8:52 PM UTC / 2026-11-23 2:22 AM IST) say Apple silicon is supported now and that loading official or third-party **GGUF** through Ollama's bundled llama.cpp failed with `unknown model architecture: 'inkling2_loop'` / `unknown projector type: inkling2v`. Do not claim `ollama run inkling-2-mini` works on this Linux box or on Windows until that lands. The live path on non-Mac hardware is llama.cpp (below).

**2. llama.cpp / Llama App (official GGUF)**

- Official GGUF repo: **`ggml-org/Inkling-2-Mini-GGUF`**. Documented command (HF blog + GGUF card):
  - `llama serve -hf ggml-org/Inkling-2-Mini-GGUF:IQ4_NL` (17.6 GB; 4-bit experts in layers 0–19, other matrices Q8_0)
  - `:Q8_0` for the 27.8 GB near-lossless quant; BF16 is 52.2 GB. Vision projectors: mmproj BF16 642 MB / Q8_0 346 MB (`-hf` pulls the projector).
- Architecture string: `inkling2_loop`.
- llama.cpp HTTP server (README fetched 2026-11-23): **OpenAI-compatible** `POST /v1/chat/completions`, including OpenAI-style function calling when Jinja is on (`--jinja` is **default enabled**). Default listen address **`127.0.0.1:9931`** (older docker examples still use 8080 — do not hard-code the port). `reasoning_effort` is a first-class request field (`none` disables thinking in the server; other values are passed to the template). A `--reasoning-effort` CLI default also exists.
- Do **not** start llama-server with `--tools all` / `--agent`. Those flags enable llama.cpp's own host file tools. This demo implements its own sandboxed tools over the Chat Completions `tools` parameter.
- Unsloth GGUFs are listed on the official model card (`unsloth/Inkling-2-Mini-GGUF`); exact quant filenames were not re-audited for this plan. Prefer the ggml-org files in docs.

LM Studio catalog support was **not** confirmed from Thinking Machines or Hugging Face primary pages. Do not document it as official.

### Tinker (hosted; optional overflow, not the offline path)

- Training / sampling IDs: `thinkingmachines/Inkling-2-Mini` (64K train / 1M sample) and `thinkingmachines/Inkling-2-Mini:peft:262144` (256K train / 1M sample).
- Sampling price (per 1M tokens): **$0.15** prefill, **$0.015** cached prefill, **$0.50** sample. (AA cites the same first-party rates.)
- OpenAI-compatible base: `https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1`, auth `TINKER_API_KEY`.
- Serverless Inference (beta) on the pricing page is listed for **Inkling and Inkling-Small only**, not Inkling 2 Mini. Do not invent a `:sampling-nvfp4` serverless id for Mini.
- A Tinker URL is **not localhost**. If someone points `LOCAL_LLM_BASE_URL` at Tinker, the offline badge must stay off (or show "hosted") and the UI must not claim airplane-mode / no-network.

### Auth / env (server only; never sent to the browser)

- `LOCAL_LLM_BASE_URL` — OpenAI-compatible base, including `/v1` if required (examples: `http://127.0.0.1:11434/v1` for Ollama, `http://127.0.0.1:9931/v1` for current llama-server). If unset, stay in recorded demo mode.
- `LOCAL_LLM_MODEL` — default `inkling-2-mini` (Ollama tag). For llama.cpp, operators may set the alias or GGUF name their server advertises.
- Optional `LOCAL_LLM_API_KEY` (default a dummy such as `local` / `ollama`; required by the OpenAI SDK, ignored by local servers).
- Optional `LOCAL_LLM_REASONING_EFFORT` — default **`low`** (0.2) so local laptops stay snappy; document that the template default is 0.9 if omitted.
- `MOCK=1` forces recorded demo mode even if a local URL is set.
- `POCKET_FOLDER` optional default sandbox root; otherwise the UI picks the shipped fixtures or a user-selected folder.

A `/api/mode` endpoint reports base URL host (not a remote key), model, mock vs live, and whether the target is loopback. Never return the API key.

### SDK pin and age gate

- Latest `openai` on npm as of this plan is **7.62.0** (published 2026-11-20 01:43:43 UTC / 2026-11-20 7:13 AM IST). The 72-hour cutoff at plan time (2026-11-23 05:53 UTC / 11:23 AM IST) is 2026-11-20 05:53 UTC, so **7.58.0 through 7.62.0 are all past the gate**.
- Age-compliant feature pin: **`openai@7.62.0`**. It already supports Chat Completions, streaming, and `tools`. Pass the local model id as a string. If typings reject `reasoning_effort` or `reasoning_content`, use `extra_body` or a narrow assertion — do not invent fields the local server does not accept.
- **`lucide-react@1.77.0`** (published 2026-11-20 06:17:09 UTC / 11:47 AM IST) is **still inside the 3-day gate** (eligible 2026-11-23 11:47 AM IST). Keep **`lucide-react@1.69.0`**.
- **Never weaken** `apps/inkling-mini-pocket-agent/bunfig.toml` `[install] minimumReleaseAge = 259200`. If `bun install` hard-fails the gate, stop and report.

## Open questions (do not invent; isolate behind the adapter)

1. **Whether the cloud-agent or review machine actually has Inkling 2 Mini loaded locally.** Recorded demo mode must work with no model and no local server. If live is untested, say so in README / Implementation notes.
2. **Exact live tool-call wire shape** on Ollama vs llama-server for this model (argument JSON as string vs object, `reasoning_content` vs Ollama `thinking`, parallel calls). Parse both; record what the first successful live run actually returned.
3. **Whether a given llama.cpp build's bundled chat template emits tool calls correctly** for `inkling2_loop`. The official repo ships `chat_template.jinja` with `tool_declare`. If a build drops tools, say so; do not silently parse free-form text as tools unless labelled as a fallback.
4. **Practical local context length and tokens/sec** on whatever machine is used. Do not fabricate a tokens/sec number; show "—" or a recorded fixture value in mock mode.
5. **Ollama GGUF support on Linux/Windows** may land after this plan. Re-check issue #19817 before documenting a new Ollama-on-PC path.

## Age-compliant pins (bunfig minimumReleaseAge = 259200)

Feature pin: **`openai@7.62.0`**. Reuse the shared Vite/shadcn set already in tree: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7`, `@vitejs/plugin-react@5.2.0`, `typescript@5.8.3`, `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `@types/bun@1.4.4` (1.4.5, published 2026-11-20 02:06:17 UTC, is also past the gate but reuse 1.4.4), `@types/node@24.19.2`, `@types/react@19.1.13`, `@types/react-dom@19.1.9`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0`, `@base-ui/react@1.9.0`, `@fontsource-variable/geist@5.3.0`, `shadcn@4.23.0`, `class-variance-authority@0.7.1`, `cn@0.5.2`, `next-themes@0.4.6`, `tw-animate-css@1.4.0`, `eslint@9.36.0`, `@eslint/js@9.36.0`, `eslint-plugin-react-hooks@5.2.0`, `eslint-plugin-react-refresh@0.4.20`, `globals@16.4.0`, `typescript-eslint@8.44.0`. Prefer an exact pin for `openai`. Do not add Playwright unless its resolved version clears the gate — `bun test` unit/API tests are the required suite.

## Single-user MVP

In:

- **Folder pane**: pick the shipped **sample pocket** (notes + receipts under `shared/fixtures/pocket/`) or point the server at a local directory. Show the file list (name, type, size, current tags). Clearly label fixtures as sample / hand-authored, not model output or official Thinking Machines assets.
- **Run agent**: a primary action asks Inkling 2 Mini (or the recorded script) to inventory the folder, read the files, tag them, and write a summary markdown file **inside the sandbox** (for example `pocket-summary.md`). The model may loop: tool call → result → next call, until it writes the summary or hits a turn cap (suggested 12).
- **Sandboxed tools only** (Zod-validated; paths resolved and confined to the chosen root; reject `..`, escaping symlinks, and absolute paths outside the root):
  - `list_files` — optional glob, returns relative paths + mime/size.
  - `read_file` — text files as UTF-8 (size-capped). Image receipts (PNG/JPEG/WebP) may be returned as image content parts so a live multimodal model can read them; mock mode uses captions already in the fixture script.
  - `tag_file` — attach tags; persist in a sidecar under the sandbox (for example `.pocket/tags.json`), not by rewriting the original note.
  - `write_summary` — write/overwrite only the agreed summary filename inside the root.
  - **No delete, no shell, no network tool, no overwrite of arbitrary files.**
- **Tool-call trace**: a live list of each call (name, args, result excerpt, duration). Clicking a `read_file` / `tag_file` highlights that file in the list.
- **Metrics strip** (always visible after a run): TTFT ms (streamed live; canned in mock), tokens/sec (label the formula: completion tokens after first token ÷ generation seconds, or say "n/a" if usage is missing), input/output tokens, turn count, wall-clock ms, model id, and a **26.4B / 5.4B effective-active / looped** badge. Do not show official AA Index / SWE-Bench figures.
- **Offline / no-network badge**: green only when the configured `LOCAL_LLM_BASE_URL` host is loopback (`127.0.0.1`, `localhost`, `::1`) and the adapter actually sent traffic only there (unit-test the URL allowlist; fail closed). Recorded mode shows **"Recorded demo mode — no model loaded, no network calls"** instead. A remote/Tinker URL must not display as offline.
- **Two clearly separated modes:**
  - **Live** (a loopback `LOCAL_LLM_BASE_URL` is set, no `MOCK=1`): real Chat Completions with `tools` and streamed TTFT through a server-side adapter. Never expose the API key to the browser, client bundles, or logs.
  - **Recorded demo (default, no URL or `MOCK=1`)**: a deterministic scripted tool trace + tagged files + written summary, with canned TTFT / tokens/sec, clearly badged. Pointing at a folder that is not the fixture in mock mode must **not** invent a new summary — show "Live mode needed to read your own folder. Start Ollama or llama-server and set `LOCAL_LLM_BASE_URL`." and keep the file list (same honesty rule as Hy4 / Astra).
- **Mode banner** with exact live setup: env vars, example `ollama run inkling-2-mini` (Apple Silicon) and `llama serve -hf ggml-org/Inkling-2-Mini-GGUF:IQ4_NL`, `bun install && bun run dev`.
- **Run:** `cd apps/inkling-mini-pocket-agent && bun install && bun run dev` (recorded demo by default). Tests pass in CI with no model.
- The cloud agent appends **one row** to the root README Demos table and includes at least one screenshot **and** one video of the running **recorded** desk in the PR (load fixtures, run agent, tool-call trace, tags + summary, metrics, recorded/offline badges).

Out: auth/accounts, multi-user, cloud/Tinker as the default path, downloading or serving the 20 GB weights inside this app, llama.cpp `--tools all` host tools, delete/shell tools, official benchmark claims in the UI, deployment, saved history beyond the sandbox sidecar, Playwright e2e unless a gate-clear version is already in tree.

## Architecture

```
Vite + React + shadcn desk
  FolderPane + FileList + OfflineBadge + MetricsStrip
    ──▶ POST /api/run ──▶ server/agent.ts  (tool loop)
  TraceView + SummaryPane + TagChips
       ◀── JSON AgentResult (streamed events optional)

server/
  adapter/types.ts    RunRequest { rootId: 'fixture' | 'custom', customPath? }
                      AgentEvent / AgentResult { trace, files, summaryPath,
                        ttftMs, tokensPerSec, usage, source: 'live'|'mock',
                        endpointHost, offline, model }
  adapter/local.ts    OpenAI-compatible Chat Completions + tools, loopback-only
  adapter/mock.ts     recorded script; same AgentResult shape
  tools.ts            list_files / read_file / tag_file / write_summary
  sandbox.ts          resolve + confine paths; no escape; no delete
  env.ts              URL / model / MOCK=1; offline host check

shared/
  fixtures/pocket/    notes (.md), receipts (PNG or text), recorded
                      trace + tags + summary + meta.json (tokens, TTFT, t/s)
```

One adapter interface drives both modes so the trace UI behaves identically. Keep SDK / wire details inside the local adapter. Stream the live response so the desk can record **TTFT** (time to first content, reasoning, or tool-call delta).

## Stack (one line each)

- **Bun**: repo standard for install, scripts, tests, and the HTTP API.
- **Vite + React + TS** (`bunx create-vite`, skip install, write `bunfig.toml` before `bun install`): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, ScrollArea, Tooltip, Sonner on demand.
- **openai@7.62.0** (server-only): OpenAI-compatible Chat Completions, streaming TTFT, `tools`.
- **zod**: request/response and tool-argument validation.

## Tasks (vertical slices)

1. Scaffold the app with `bunx create-vite` (skip install), write `bunfig.toml` with `minimumReleaseAge = 259200` **before** any install, pin the dependency set, prove `bun install` and `bun run build`.
2. Implement the sandbox + four tools, the adapter interface, the recorded mock adapter + fixture pocket (notes, receipts, scripted trace, sidecar tags, summary, canned metrics), and unit tests (path escape rejection, symlink/absolute-path denial, mock badge fields, unknown-folder rejection in mock, offline-host allowlist, tokens/sec formula).
3. Build the folder pane, file list, tag chips, summary viewer, tool-call trace, metrics strip, offline / recorded badges, mode banner, and an end-to-end mock run.
4. Implement the live local adapter: Chat Completions with `tools`, streamed TTFT, `reasoning_effort` default `low`, env-configurable base URL / model, loopback-only check, turn cap. Typecheck without a local server. `/api/mode` must never include the key. Document exact live setup (Ollama on Apple Silicon vs llama.cpp GGUF) and any remaining open questions honestly in README / Implementation notes after the first successful live call (or state live is untested).
5. Validate the production build and tests (`bun test` must pass with no model); capture a screenshot and a video of the running **recorded** desk showing a fixture run, the tool-call trace, tags + summary, labelled metrics, and the recorded-demo badge. If a local Inkling 2 Mini server is available, also verify a live run and report the tool-call wire shape; otherwise state live is untested.

## Build constraints (cloud agent)

- Touch **only** `apps/inkling-mini-pocket-agent/` plus **one** new row in the root README Demos table. Do not edit other apps, skills, or tracker files. Never create a new repo.
- Open **one PR** against `https://github.com/AseemWangoo/x-bookmark-demos` (this repo). Include at least **one screenshot AND one video** of the running app exercising the real flow (fixture folder, tool-call trace, tags, summary, metrics, recorded/offline badge).
- `bun install`, `bun test`, and `bun run build` must pass cleanly. Do not weaken `bunfig.toml` `minimumReleaseAge = 259200`. Do not bump `lucide-react` to 1.77.0 until that publish date clears the 3-day gate.
- Honest labelling of recorded vs live in the UI, README, and PR body. Do not download the 20 GB weights in CI.

## Deferred

Tinker / hosted inference as a default path, serverless Tinker IDs, variable-loop research model, llama.cpp built-in `--tools all`, Ollama cloud, LM Studio (unverified officially), official AA Index or SWE-Bench badges in the UI, downloading or bundling weights, multi-folder workspaces, delete/rename tools, Playwright e2e unless a gate-clear version is already in tree, deployment.

## Post notes

Honest framing: a private, offline-first pocket agent on **Inkling 2 Mini** (Thinking Machines open-weight looped MoE, 26.4B total / 5.4B effective-active, ~20 GB, 1M context, Apache 2.0); live path talks to a local OpenAI-compatible `/v1/chat/completions` server (Ollama `inkling-2-mini` on Apple Silicon, or llama.cpp `ggml-org/Inkling-2-Mini-GGUF`); the video uses recorded demo mode if no local model was loaded. Tag at most three verified handles (likely `@thinkymachines`, and `@ollama` or `@ggerganov` if the post names that stack — confirm the live accounts at post time; do not invent handles; do not tag unverified `@llama_cpp` / `@ggml_org`). Do not claim the fixture tags were model-generated, and do not claim the model runs on a 16 GB laptop.
