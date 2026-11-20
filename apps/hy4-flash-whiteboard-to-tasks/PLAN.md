# Hy4 Flash Whiteboard-to-Tasks: PLAN

Sources (read 2026-11-20):

- [Tencent launch blog: Hy4 flash](https://www.tencent.com/zh-cn/tencent-launches-hy4-flash-to-power-high-speed-cost-efficient-ai-deployment-for-everyday-workflows/) (2026-11-16)
- [Official research page](https://hy.tencent.ai/research/hy4-flash) (linked from the open-weight post)
- [GitHub: Tencent-Hunyuan/Hy4-flash](https://github.com/Tencent-Hunyuan/Hy4-flash) and [Hugging Face: tencent/Hy4-flash](https://huggingface.co/tencent/Hy4-flash) (instruct, plus FP8 and Base)
- [TokenHub Hy API Guide](https://www.tencentcloud.com/document/product/1300/80695) (updated 2026-11-16)
- [TokenHub Language Model Invocation Overview](https://cloud.tencent.com/document/product/1823/130079)
- [TokenHub Image Understanding](https://intl.cloud.tencent.com/document/product/1300/85589) and [CN image docs](https://cloud.tencent.com/document/product/1823/136956)
- [TokenHub Deep Reasoning](https://intl.cloud.tencent.com/document/product/1300/80637)
- [TokenHub model pricing](https://cloud.tencent.com/document/product/1823/130055) (updated 2026-11-16)
- [OpenRouter: tencent/hy4-flash](https://openrouter.ai/tencent/hy4-flash)
- [OpenCode Console models](https://opencode.ai/docs/console/models/) and [Inference API](https://opencode.ai/docs/console/api/inference/)
- Open-weight post: [@TencentHunyuan](https://x.com/TencentHunyuan/status/2122912575302119554) (2026-11-18 10:09 AM IST)
- Product/pricing posts: [@TencentHunyuan](https://x.com/TencentHunyuan/status/2122217770314301469) (2026-11-16 12:08 PM IST), [@tencentcloud](https://x.com/tencentcloud/status/2122219632631402590) (2026-11-16 12:16 PM IST), OpenRouter 50% off [@TencentHunyuan](https://x.com/TencentHunyuan/status/2122359683247931725) (2026-11-16 9:32 PM IST)
- OpenCode free-window posts: [@opencode](https://x.com/opencode/status/2122231173720224224) (2026-11-16 1:01 PM IST) and the 10-day extension [@opencode](https://x.com/opencode/status/2123106127030210786) (2026-11-18 10:58 PM IST)
- npm registry publish times for `openai` and the shared Vite/shadcn set (age gate = 3 days)

## Goal

A one-screen desk that takes a few whiteboard photos or screenshots plus a long pasted doc or chat thread, sends them to **Hy4 flash in one pass**, and returns a structured task board. Each task and open question links back to the exact image (filename + optional region) or the exact passage it came from. A metrics strip shows TTFT, total latency, tokens, and a **12B active / 224B MoE** badge so the speed story is visible. Mock mode is the default when no key is set.

This is a structured extraction desk, not a hosted Hy4 flash playground and not OpenCode itself. Label mock vs live honestly. Do not claim official WorkIndex, Haiku-parity, or "18x cheaper" numbers in the UI.

## Verified API facts (Hy4 flash)

### Names, architecture, and open weights

- Official product name: **Hy4 flash** (also written Hy4-flash / `hy4-flash`). Released 16 Nov 2026 on Tencent products; open weights published 18 Nov 2026.
- Marketing / official launch wording (Tencent blog and the @TencentHunyuan open-weight post): **224B total parameters (including 64B Engram), 12B active**, native text + image input, **1M context**.
- Model-card / GitHub breakdown (more precise; do not contradict it in docs): **220B total including ~64B Engram**; backbone excluding Engram, ViT, and DFly2 is 155.5B; Engram 63.5B; ViT 0.43B; DFly2 drafter 0.85B; activated parameters per token **11.3B text + 0.43B vision**; context **1,048,576 tokens**. 42-layer MoE backbone (1 dense + 41 MoE), hybrid sparse + sliding-window attention, SigLIP2-based vision encoder. Use the **224B / 12B** badge in the UI (it matches the official post) and footnote the model-card numbers in README.
- Open-weight repos: instruct `tencent/Hy4-flash`, FP8 `tencent/Hy4-flash-FP8`, base `tencent/Hy4-flash-base` on Hugging Face, ModelScope, and GitCode. License: **Tencent Hy License**. Do not ship or download the weights in this demo.
- TokenHub context for the hosted API: **1M window, max input 960k, max output 64k**. OpenRouter lists the same 1,048,576 context and 65,536 max output. Modalities: **text + image in, text out**.

### Official API model IDs and endpoints

Prefer the hosted OpenAI-compatible Chat Completions path. Self-hosting is optional, not the MVP default.

| Provider | Model ID | Base URL | Auth |
| --- | --- | --- | --- |
| **Tencent Cloud TokenHub (official)** | `hy4-flash` | Singapore (intl, default for this demo): `https://tokenhub-intl.tencentcloudmaas.com/v1` · Guangzhou: `https://tokenhub.tencentmaas.com/v1` | `Authorization: Bearer` TokenHub API key |
| **OpenRouter** | `tencent/hy4-flash` | `https://openrouter.ai/api/v1` | `Authorization: Bearer` OpenRouter key |
| **Self-hosted vLLM / SGLang** | `hy4-flash` (vLLM `--served-model-name hy4-flash`) | e.g. `http://127.0.0.1:8000/v1` | often `EMPTY` / any string |
| **OpenCode Zen (do not use as this app's live path)** | `hy4-flash-free` (OpenCode config: `opencode/hy4-flash-free`) | `https://opencode.ai/inference/openai/v1` | OpenCode key, but **free-tier chat models only work inside the OpenCode client**; other clients get HTTP **403** even with a key ([Inference API docs](https://opencode.ai/docs/console/api/inference/)) |

TokenHub also supports OpenAI Responses (`/v1/responses`) and Anthropic Messages (`/v1/messages`) for `hy4-flash`. Use **Chat Completions** (`POST /v1/chat/completions`) in this MVP: it is the path shown in the Hy API Guide, the GitHub OpenAI example, OpenRouter, and OpenCode's model table.

### Image payload format

On Chat Completions, put images in the user message `content` array as `image_url` parts, mixed with `text`. HTTPS URLs or Base64 data URLs both work. Multiple images are allowed (limit is the context window, not a hard count). Official TokenHub limits: JPEG, PNG, WEBP, non-animated GIF; recommend **≤10 MB per image** and **≤100 MB request body**. `image_url.detail` supports `auto` (default), `low`, `high`, and `original`. For whiteboard handwriting, default **`high`**.

```ts
{
  role: "user",
  content: [
    { type: "image_url", image_url: { url: "data:image/png;base64,...", detail: "high" } },
    { type: "image_url", image_url: { url: "https://example.com/board.jpg", detail: "high" } },
    { type: "text", text: "Extract the task board from these photos and the thread below:\n\n..." },
  ],
}
```

On Responses (not the MVP path), the equivalent block is `type: "input_image"` with `image_url` set to the same URL or data URL.

### Reasoning / thinking flags

Thinking is **on by default** for `hy4-flash`. Because this desk is about flash speed, the live adapter must **turn thinking off** unless the user opts into it.

- TokenHub: `reasoning_effort` default **`high`**, supports **`high`** and **`no_think`**. Also `thinking: { type: "enabled" | "disabled" }` (default enabled). Send `reasoning_effort: "no_think"` and `thinking: { type: "disabled" }` for the default speed path. On the official Node SDK examples these can be top-level fields; if `openai@7.57.0` typings reject them, pass via `extra_body`. Response thinking text, when present, is `message.reasoning_content`.
- Self-hosted (GitHub README): `extra_body: { chat_template_kwargs: { reasoning_effort: "no_think" } }`. Recommended sampling: `temperature=0.9`, `top_p=1.0`.
- OpenRouter: the model page advertises optional reasoning (on by default) and accepts a `reasoning` request field. Isolate the exact shape in the OpenRouter adapter; do not invent a TokenHub-only field on that provider. Default the desk to the no-think / disabled path.
- Expose a small **Flash (`no_think`) / Think (`high`)** toggle. Default Flash.

### Structured outputs

OpenRouter's model page states `tencent/hy4-flash` supports structured outputs via `response_format` JSON schema, plus `tools` / `tool_choice`. TokenHub's Chat Completions protocol documents `response_format` with `type: "json_schema"`. Use a **strict** Zod / JSON Schema (`additionalProperties: false`, all fields required) and `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }` (drop `strict` if a provider rejects it).

If a provider rejects `json_schema`, fall back to a labelled "JSON object" request plus fence-stripping parse — never silently invent tasks. Isolate this behind the adapter and record what actually worked in Implementation notes.

### Pricing and free windows (as of 2026-11-20)

- **Official list (USD)**, from the 16 Nov @TencentHunyuan post: **$0.070 input / $0.281 output / $0.003 cache read** per 1M tokens.
- **Official list (CNY, TokenHub catalog)**: **¥0.5 input / ¥2 output / ¥0.02 cache hit** per 1M tokens. TokenHub promo: **50% off until 2026-11-30 12:00:00 Beijing time** (2026-11-30 9:30 AM IST), then list price. The official note does not say whether cache-hit is also discounted — if the live payload does not break it out, show list vs promo on input/output only and label the assumption.
- **OpenRouter** (50% off, routed to Tencent Cloud; list matches the official USD rates): **$0.035 input / $0.1405 output / $0.0015 cache read** per 1M tokens. OpenRouter has not published a hard end date on the model page; the official Hy post called it limited-time. Label the promo in the cost UI and do not invent an expiry.
- **WorkBuddy**: free access through 30 Nov 2026 (Tencent blog and @tencentcloud). That is a Tencent product, not an API for this app.
- **OpenCode**: first announced "near-unlimited" free use for "the next 2 weeks" on 16 Nov, then on 18 Nov "still exclusively free on OpenCode for the next 10 days." OpenCode has not published an exact calendar end date. **This demo cannot call `hy4-flash-free` from the Bun server** (403 for non-OpenCode clients). Mention the in-app promo in README only.

Cost math: charge output including any reasoning tokens if usage splits them; do not double-count. `freshInput = prompt_tokens - cached_tokens` (or the provider's equivalent). If usage is missing, show a labelled estimate. After the TokenHub promo cutoff, the helper must use list rates.

### Auth / env (server only; never sent to the browser)

- `HY4_FLASH_PROVIDER` = `tokenhub` (default when a TokenHub key is present) | `openrouter` | `custom`
- `TOKENHUB_API_KEY` or `HUNYUAN_API_KEY` or `HY4_FLASH_API_KEY` (first present wins for TokenHub)
- `OPENROUTER_API_KEY` for OpenRouter
- Optional `HY4_FLASH_BASE_URL` (overrides the provider default; required for `custom` / vLLM)
- Optional `HY4_FLASH_MODEL` (defaults `hy4-flash` on TokenHub/custom, `tencent/hy4-flash` on OpenRouter)
- Optional `TOKENHUB_REGION=intl|guangzhou`
- `MOCK=1` forces mock mode even if a key is set

A `/api/mode` endpoint reports provider, model, whether a key is present, and mock vs live — never the key itself.

### SDK pin and age gate

- Latest `openai` on npm as of this plan is **7.62.0** (published 2026-11-20 01:43:43 UTC / 2026-11-20 7:13 AM IST). **7.58.0** (2026-11-17 18:31:10 UTC) and everything after it are **still under the 3-day gate**. 7.58.0 becomes eligible at 2026-11-20 18:31 UTC (2026-11-21 12:01 AM IST).
- Age-compliant pin: **`openai@7.57.0`** (published 2026-11-13 21:27:35 UTC / 2026-11-14 2:57 AM IST). It already supports Chat Completions, `response_format` json_schema, image `image_url` data URLs, and streaming. Pass TokenHub/OpenRouter model IDs as **string literals**. If typings reject extra fields (`thinking`, `reasoning_effort`, `reasoning`), use `extra_body` or a narrow assertion — do not upgrade past the gate.
- **Never weaken** `apps/hy4-flash-whiteboard-to-tasks/bunfig.toml` `[install] minimumReleaseAge = 259200`. If `bun install` hard-fails the gate, stop and report.

## Open questions (do not invent; isolate behind the adapter)

1. **Whether the cloud-agent / local environment has a TokenHub or OpenRouter key.** Mock mode must work with no key. If live is untested, say so in README / Implementation notes. Do not pretend OpenCode free is a usable server path.
2. **Exact live usage shape** (cached / reasoning / cost fields) on TokenHub vs OpenRouter vs the pinned SDK typings. Cost UI must degrade to a labelled estimate when fields are missing.
3. **Whether `response_format.json_schema` is strictly enforced** on TokenHub for `hy4-flash` the way OpenRouter advertises. Try schema first; fall back to parse-and-validate; record the result.
4. **Whether OpenRouter accepts TokenHub's `thinking` / `reasoning_effort: "no_think"`** or wants its own `reasoning` field. Branch by provider.
5. **Live bbox quality.** Ask the model for a normalized 0–1 region plus a short quote, but treat regions as approximate. Mock fixtures use hand-authored boxes. If a live region is missing, still link to the image or passage.

## Age-compliant pins (bunfig minimumReleaseAge = 259200)

Feature pin: **`openai@7.57.0`**. Scaffold pins matching Astra / Carbon and registry ages: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7` (or the create-vite default if it resolves age-compliant; `7.3.8` from 2026-11-09 is also eligible), `@vitejs/plugin-react@5.2.0`, `typescript@5.8.3`, `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `@types/bun@1.4.4` (do not take 1.4.5, published 2026-11-20), `@types/node@24.19.2`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0`. Prefer an exact pin for `openai`; caret ranges are fine for ordinary UI deps once install proves age-compliant. Do not add Playwright unless its resolved version clears the gate — `bun test` unit/API tests are the required suite.

## Single-user MVP

In:

- **Input pane**: drop or pick up to a few whiteboard photos / screenshots (preview strip, remove per image), plus a large textarea for a pasted doc or chat thread. Seed with **two hand-authored fixtures**:
  1. **Sprint whiteboard + incident thread**: 2–3 realistic whiteboard assets (clean SVG exported to PNG in `public/` or `shared/fixtures/`, not stock photos of real people) showing columns, owners, dates, and blockers, plus a long product/incident Slack-style thread with owners and due hints buried in the text.
  2. **Architecture review board + RFC**: one or two system-sketch boards plus a long pasted design-doc / RFC with open questions and action items.
  Clearly label fixtures as sample / hand-authored, not model output or official Tencent assets.
- **One-pass extract**: a primary action sends **all selected images + the full thread** in a single Chat Completions request and renders the board.
- **Task board**: tasks grouped or filterable by **owner**, **due hint**, **priority**, and **status**. A separate **Open questions** list. Each item has a **source back-link**:
  - Image source: filename / fixture label, optional normalized bbox overlay, short visual quote.
  - Text source: clickable jump that highlights the exact passage or line range in the pasted doc.
- **Metrics strip** (always visible after a run): TTFT ms (streamed live; canned in mock), total wall-clock ms, input / cached / output / reasoning tokens, computed cost with promo/list label, context-window reminder (1M), and a **12B active / 224B MoE** badge. Provider + model ID + Flash/Think mode shown.
- **Provider + effort**: Flash / Think toggle (default Flash). In live mode, a provider selector (TokenHub / OpenRouter / Custom base URL) that only appears when the matching key or custom URL is configured; otherwise the banner tells the user which env vars to set.
- **Two clearly separated modes:**
  - **Live** (a key is set, no `MOCK=1`): real Chat Completions through a server-side adapter. Never expose the key to the browser, client bundles, or logs.
  - **Mock (default, no key)**: deterministic recorded boards with canned TTFT / total ms / token / cost numbers, clearly badged **"Mock / Sample Mode — recorded outputs, no Hy4 flash calls"**. Fixtures must include working source back-links (real highlights, real bbox overlays). Uploading an unknown photo or pasting a novel doc in mock mode must **not** invent a new board — show "Live mode needed to read your own images or text. Set a TokenHub or OpenRouter key." and keep the previews (same honesty rule as Terra / Astra).
- **Mode banner** with exact live setup: env vars, default model IDs, `bun install && bun run dev`.
- **Run:** `cd apps/hy4-flash-whiteboard-to-tasks && bun install && bun run dev` (mock by default). Tests pass in CI with no key.
- The cloud agent appends **one row** to the root README Demos table and includes at least one screenshot **and** one video of the running **mock** desk in the PR (fixture load, extract, click a text source and an image region, metrics strip, mock badge).

Out: auth/accounts, multi-user, saved history, deployment, downloading or serving the 220B weights, OpenCode-client live calls, WorkBuddy, Responses / Anthropic paths, tool calling, official benchmark or "18x cheaper" claims in the UI, OCR-only pipelines, realtime collaboration.

## Architecture

```
Vite + React + shadcn desk
  InputPane (dropzone + thread) + EffortToggle
    ──▶ POST /api/extract ──▶ server/extract.ts
  TaskBoard + OpenQuestions + SourceViewer + MetricsStrip
       ◀── JSON ExtractResult

server/
  adapter/types.ts    ExtractRequest { text, images: { id, name, dataUrl }[],
                                      fixtureId?, effort: 'no_think'|'high',
                                      provider? }
                      ExtractResult { board, latencyMs, ttftMs?, usage?, cost,
                                      source: 'live'|'mock', provider, model,
                                      effort }
  adapter/tokenhub.ts isolated Chat Completions client (intl/guangzhou base)
  adapter/openrouter.ts same interface, OpenRouter model id + reasoning branch
  adapter/custom.ts   vLLM/SGLang via HY4_FLASH_BASE_URL
  adapter/mock.ts     labelled fixtures; same ExtractResult shape
  cost.ts             TokenHub CNY/USD + OpenRouter promo/list tables with
                      the 2026-11-30 12:00 Beijing TokenHub cutoff
  schema.ts           Zod board schema (tasks, open questions, sources)
  env.ts              key presence → mode; MOCK=1 override; provider pick

shared/
  fixtures/           2 scenarios: PNG/SVG boards + long threads + recorded
                      boards with bbox/line sources + meta.json (tokens,
                      TTFT, total ms, cost)
```

One adapter interface drives both modes so the board behaves identically. Keep SDK / wire details inside the provider adapters. Stream the live response so the desk can record **TTFT** (time to first content or reasoning token) and still assemble the final JSON at the end. Default `reasoning_effort: "no_think"` / thinking disabled.

Suggested board schema (strict JSON Schema / Zod): `summary`, `tasks[]` (`id`, `title`, `details`, `owner`, `dueHint`, `priority` enum `low|medium|high`, `status` enum `todo|in_progress|blocked|done`, `source`), `openQuestions[]` (`id`, `question`, `source`). `source` is `{ type: "image"|"text", imageId?, imageName?, quote?, startLine?, endLine?, region?: { x, y, w, h } }` with normalized 0–1 region coordinates. Keep it strict so Structured Outputs can enforce it.

## Stack (one line each)

- **Bun**: repo standard for install, scripts, tests, and the HTTP API.
- **Vite + React + TS** (`bunx create-vite`, skip install, write `bunfig.toml` before `bun install`): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, Textarea, Tabs or ToggleGroup, Tooltip, Sonner on demand.
- **openai@7.57.0** (server-only): OpenAI-compatible Chat Completions, image data URLs, structured outputs, streaming TTFT.
- **zod**: request/response and board-schema validation.

## Tasks (vertical slices)

1. Scaffold the app with `bunx create-vite` (skip install), write `bunfig.toml` with `minimumReleaseAge = 259200` **before** any install, pin the dependency set, prove `bun install` and `bun run build`.
2. Implement the adapter interface, Zod board schema, mock adapter + two fixtures with authored whiteboard PNG/SVG assets, long threads, recorded boards, working bbox/line back-links, and the cost helper with unit tests (TokenHub promo cutoff, OpenRouter rates, no double-counting of reasoning tokens, fresh vs cached input, mock badge fields, unknown-upload rejection in mock).
3. Build the dropzone, thread editor, fixture picker, Flash/Think toggle, task board, open questions, source viewer (image overlay + text highlight), metrics strip, mode banner, and an end-to-end mock extract (back-links, labelled metrics, mock badge).
4. Implement live adapters for TokenHub and OpenRouter (plus custom base URL): Chat Completions with `image_url` data URLs, `response_format` json_schema, provider-correct no-think flags, streaming TTFT, usage → cost mapping, env-configurable model / base URL. Typecheck without a key. `/api/mode` must never include the key. Document exact live setup and any remaining open questions honestly in README / Implementation notes after the first successful live call (or state live is untested).
5. Validate the production build and tests (`bun test` must pass with no key); capture a screenshot and a video of the running **mock** desk showing a fixture extract, an image-region click, a thread-passage click, labelled metrics, and the mock badge. If a TokenHub or OpenRouter key is available, also verify live Flash mode and report the usage shape and whether `json_schema` / `no_think` were honoured; otherwise state live is untested.

## Build constraints (cloud agent)

- Touch **only** `apps/hy4-flash-whiteboard-to-tasks/` plus **one** new row in the root README Demos table. Do not edit other apps, skills, or tracker files. Never create a new repo.
- Open **one PR** against `https://github.com/AseemWangoo/x-bookmark-demos` (this repo). Include at least **one screenshot AND one video** of the running app exercising the extract flow (images + pasted/fixture doc, task board, source back-links, latency readout).
- `bun install`, `bun test`, and `bun run build` must pass cleanly. Do not weaken `bunfig.toml` `minimumReleaseAge = 259200`. Do not bump `openai` past 7.57.0 until 7.58.0+ publish dates clear the 3-day gate.
- Honest labelling of mock vs live in the UI, README, and PR body.

## Deferred

Responses / Anthropic protocol paths, OpenCode-client integration, downloading or serving open weights, WorkBuddy, tool calling, deployment, saved history, multi-user boards, official WorkIndex / Haiku / cost-reduction claims in the UI, a live TokenHub-vs-OpenRouter duel layout, Playwright e2e unless a gate-clear version is already in tree.

## Post notes

Honest framing: a whiteboard-to-task-board desk on **Hy4 flash** (Tencent Hy open-weight MoE, 12B active / 224B total, 1M context, native vision); live path uses the verified OpenAI-compatible Chat Completions API (`hy4-flash` on TokenHub and/or `tencent/hy4-flash` on OpenRouter); the video uses mock / recorded outputs if no key was available. Tag at most three verified handles (likely `@TencentHunyuan`, and `@OpenRouter` or `@opencode` depending on which path the post mentions — confirm the live accounts at post time; do not invent handles). Do not claim the fixture boards were model-generated, and do not present OpenCode's in-app free tier as something this demo called.
