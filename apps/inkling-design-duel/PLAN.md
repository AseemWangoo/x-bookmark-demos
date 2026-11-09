# Inkling Design Duel: PLAN

Sources (read 2026-11-09):
- [Thinking Machines launch post](https://x.com/thinkymachines/status/2118489527362912566) (Inkling 2 Small on Tinker).
- [Artificial Analysis](https://x.com/ArtificialAnlys/status/2118493376186388530), [Design Arena](https://x.com/DesignArena/status/2118490433420685380).
- [Models & Pricing](https://tinker-docs.thinkingmachines.ai/tinker/models/models_and_pricing/)
- [OpenAI-Compatible API](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/openai/)
- [Anthropic-Compatible API](https://tinker-docs.thinkingmachines.ai/tinker/compatible-apis/anthropic/)
- [Thinking effort](https://tinker-docs.thinkingmachines.ai/cookbook/inkling/thinking-effort/)
- [Using Inkling](https://tinker-docs.thinkingmachines.ai/cookbook/inkling/)
- [Images](https://tinker-docs.thinkingmachines.ai/cookbook/inkling/images/)
- npm registry publish times for the pinned dependency set (age gate = 3 days).

## Goal
A one-screen design duel: type a UI prompt (or upload a sketch), and Inkling 2 Small generates the page **twice** — once at **low** reasoning effort and once at **high**. The two HTML outputs render side by side in sandboxed iframes, each labelled with latency, tokens, and computed USD cost. The interaction is the demo: same prompt, different effort, visible quality/latency/cost tradeoff.

## Verified API facts (Tinker / Inkling 2 Small)
- **Model family**: Inkling 2 Small — MoE, **594B** total / **17B** active, Hybrid + Vision, multimodal text+image in. Apache 2.0 weights announced as due next week (treat as marketing claim; do not block the demo on weights).
- **Tinker IDs** (from Models & Pricing):
  - Training / Cookbook base: `thinkingmachines/Inkling-2-Small` (64K) and `thinkingmachines/Inkling-2-Small:peft:262144` (256K).
  - Serverless inference (beta): `thinkingmachines/Inkling-2-Small:peft:262144:sampling-nvfp4` (256K).
- **Pricing** (per million tokens, serverless / sampling table for Inkling 2 Small): input (prefill) **$0.30**, cached input **$0.03**, output (sample) **$1.00**. Use these constants for the on-screen cost calculator. Prefer `usage.prompt_tokens` / `usage.completion_tokens` from the response when present; if missing, fall back to a labelled estimate and say so in the UI.
- **OpenAI-compatible HTTP API** (preferred adapter path for this demo):
  - Base URL: `https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1`
  - Auth: `TINKER_API_KEY` as the OpenAI client `api_key` (Bearer).
  - Endpoints: `/chat/completions` (recommended) and `/completions`.
  - Reasoning control: standard OpenAI `reasoning_effort` on `/chat/completions` — string presets `"none" | "minimal" | "low" | "medium" | "high" | "xhigh"` **or** a float in `[0.0, 0.99]` via `extra_body`. Internal map: none→0.0, minimal→0.1, low→0.2, medium→0.7, high→0.9, xhigh→0.99. Default when omitted: `0.9`. Demo duel uses **`low` (0.2)** vs **`high` (0.9)**.
  - Optional: `separate_reasoning: true` (default true as of June 2026) returns `message.reasoning_content` separate from `content`. Use it so the iframe gets clean HTML and the desk can optionally show a collapsed reasoning panel.
- **Anthropic-compatible HTTP API** (fallback adapter, same key):
  - Base URL: `https://tinker.thinkingmachines.dev/services/tinker-prod/anthropic/api`
  - Auth: `x-api-key` or `Authorization: Bearer` with `TINKER_API_KEY`.
  - Model examples in docs include base names like `thinkingmachines/Inkling` and sampler paths `tinker://...`. Effort via `extra_body: { output_config: { effort: "low"|"medium"|"high"|"xhigh"|"max" } }` (named levels only). Images via base64 or url sources are explicitly supported here.
- **Image input (Cookbook / renderer docs)**: PNG or JPEG. OpenAI-compatible message shape uses `content` parts `{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }` plus a text part. Remote HTTP URLs are **not** fetched by the renderer — the app must send a data URI. Native SDK sampling uses `tml-renderers`; this demo should prefer the HTTP compatible APIs so the Bun server stays simple.
- **Native Python SDK** (`tinker.ServiceClient().create_sampling_client(base_model=...)`) exists but is out of scope for this Bun desk; keep it as a deferred alternative.

### Open questions (do not invent; isolate behind the adapter)
1. **Exact model string on the OpenAI-compatible `/chat/completions` endpoint for base Inkling 2 Small.** Docs examples for that page show sampler paths (`tinker://.../sampler_weights/...`). Anthropic-compatible docs and the Cookbook explicitly accept base names like `thinkingmachines/Inkling` / `thinkingmachines/Inkling-2-Small`. Serverless table lists `thinkingmachines/Inkling-2-Small:peft:262144:sampling-nvfp4`. **Adapter default try-order:** (a) `thinkingmachines/Inkling-2-Small`, (b) serverless id, (c) env override `TINKER_MODEL`. Record which one works in Implementation notes; never hardcode a guessed third-party id.
2. **Whether `image_url` content parts work on the OpenAI-compatible HTTP endpoint.** Confirmed for Cookbook `tml-renderers` and for the Anthropic-compatible HTTP API. The OpenAI-compatible page does not document vision. If live OAI rejects images, fall back to the Anthropic adapter for sketch uploads, or keep sketch upload mock-only and say so honestly in the UI/README.
3. **Whether `usage` token fields are always populated** on compatible responses. Cost UI must degrade gracefully to "estimate" when they are missing.
4. **Production serverless access:** docs mark serverless inference as beta / waitlist for higher throughput. A personal `TINKER_API_KEY` may or may not have sampling access; mock mode must work without any key.

### Age-compliant pins (bunfig minimumReleaseAge = 259200)
Feature pin: **`openai@7.52.0`** (published 2026-11-05; `7.53.0` is under the 3-day gate as of plan write). Scaffold pins matching the async desk style and registry ages: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7` (or the create-vite default if it resolves age-compliant), `@vitejs/plugin-react@5.2.0`, `typescript@~5.8.3` or `5.9.3`, `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `@types/bun@1.4.4`, `@types/node@24.19.2`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0`. Prefer exact pins for `openai` and the Tinker-facing client; caret ranges are fine for ordinary UI deps once install proves age-compliant. If Bun hard-fails the age gate, stop and report; do not weaken `bunfig.toml`.

## Single-user MVP
In:
- **Prompt bar**: textarea for a UI brief (seeded examples: "pricing page for an AI API", "settings panel with dark mode", "mobile onboarding carousel"). Optional **sketch upload** (PNG/JPEG → data URI) that appends an image part when the adapter supports it.
- **Generate duel**: one click fires **two parallel** generations with `reasoning_effort: "low"` and `"high"` (same system prompt: "Return a single self-contained HTML document…"). Show per-pane pending/streaming/error states.
- **Side-by-side panes**: sandboxed iframes (`sandbox="allow-scripts"` without `allow-same-origin` unless a clear reason emerges) rendering the model `content` as srcdoc HTML. Each pane header shows effort label, latency ms, prompt/completion tokens, and computed USD using the $0.30 / $1.00 rates. Optional collapsed "reasoning" drawer from `reasoning_content`.
- **Two clearly separated modes:**
  - **Live** (`TINKER_API_KEY` set): real Tinker OpenAI-compatible (primary) or Anthropic-compatible (fallback) calls through an isolated server-side adapter. Never expose the key to the browser.
  - **Mock (default, no key)**: deterministic recorded low/high HTML fixtures with canned latency/token/cost numbers, clearly badged **"Mock mode — recorded outputs, no Tinker calls"**. Fixtures must look like distinct low-vs-high quality so the video reads. Never claim mock HTML came from Inkling.
- **Mode banner** with exact live setup: set `TINKER_API_KEY`, optional `TINKER_MODEL` / `TINKER_BASE_URL`, `bun install && bun run dev`.
- **Run:** `cd apps/inkling-design-duel && bun install && bun run dev` (mock by default).

Out: auth/accounts, multi-user, fine-tuning / TrainingClient, native Python `tinker` SDK, Design Arena submission, deployment, storing generations, editing HTML in-pane, non-HTML targets (React/SVG-only), audio input.

## Architecture
```
Vite + React + shadcn desk
  PromptBar + SketchUpload ──▶ POST /api/duel ──▶ server/duel.ts
  DuelPanes (low | high iframes) ◀── SSE or JSON pair of GenerationResult

server/
  adapter/types.ts     GenerationRequest { prompt, imageDataUrl?, effort }
                       GenerationResult { html, reasoning?, latencyMs, usage?, costUsd, source }
  adapter/tinker.ts    isolated Tinker client (OpenAI-compatible primary;
                       Anthropic-compatible fallback; model id from env/try-order)
  adapter/mock.ts      labelled fixtures; same GenerationResult shape
  cost.ts              costUsd = promptTokens*0.30/1e6 + completionTokens*1.00/1e6
  prompts.ts           system prompt forcing a single HTML document

shared/
  fixtures/            recorded low.html / high.html (+ meta.json for tokens/latency)
```
One adapter interface drives both modes so panes behave identically. Keep Tinker wire details inside `adapter/tinker.ts` so open questions (model id, vision path) stay swappable without UI churn.

## Stack (one line each)
- **Bun**: repo standard for install, scripts, tests and HTTP API.
- **Vite + React + TS** (`bunx create-vite`, skip install): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, Textarea, Tabs, Tooltip, Sonner on demand.
- **openai@7.52.0** (server-only): OpenAI SDK pointed at Tinker's OAI base URL; Anthropic path only if vision/model-id forces it (add `@anthropic-ai/sdk` only if needed and age-compliant).
- **zod**: request/response validation at the API boundary.

## Tasks (vertical slices)
1. Scaffold app + `bunfig.toml` before install; pin dependency set; prove install/build.
2. Implement adapter interface, mock adapter + fixtures, and cost helper with unit tests (low vs high efforts, cost math, mock badge fields, HTML extraction from fenced replies if the model wraps markdown).
3. Build prompt bar, dual panes, mode banner, and end-to-end mock duel (parallel "generations", iframe render, metrics). Sketch upload UI present; wired through adapter even if live vision is unresolved.
4. Implement live `adapter/tinker.ts` against the OpenAI-compatible endpoint with `reasoning_effort` low/high, `separate_reasoning`, usage→cost mapping, and env-configurable model id. Typecheck without a key. Document exact live setup and any remaining open questions honestly in README / Implementation notes after first successful live call (or state live is untested).
5. Validate production build and tests; capture screenshot + video of the running **mock** desk showing both panes with labelled metrics. If `TINKER_API_KEY` is available, also verify live and report which model id worked; otherwise state live is untested.

## Deferred
Native `tinker` Python SDK, fine-tuning / LoRA, Design Arena export, deployment, multi-model comparison beyond low/high effort, editable iframe round-trips, audio.

## Post notes
Honest framing: built on Thinking Machines Inkling 2 Small via Tinker; video uses mock/recorded outputs if no `TINKER_API_KEY` was available. Tag verified `@thinkymachines` and `@tinkerapi` (max 3; no third tag unless verified). Do not invent handles.

## Implementation notes
- Live mode was not exercised. No `TINKER_API_KEY` was available in this environment, so which model id works on `/chat/completions`, whether `image_url` is accepted there, and which `usage` fields come back are still open. The desk stays in mock mode without a key and labels those panes as recorded output.
- OpenAI-compatible body sends `reasoning_effort` as the float `0.2` or `0.9` (not the string preset) plus `separate_reasoning: true`, matching the Tinker docs' `extra_body` examples. The pinned `openai@7.52.0` types only allow the string union, so the float is passed through a cast; the SDK sends unknown body fields.
- Model try order when the key is set: `TINKER_MODEL` first if it is set (operator override), then `thinkingmachines/Inkling-2-Small`, then `thinkingmachines/Inkling-2-Small:peft:262144:sampling-nvfp4`. Each id is tried on the OpenAI-compatible client (`maxRetries: 0`). If all of those fail, the same ids are tried on `POST {ANTHROPIC_BASE}/v1/messages` with `x-api-key`, `anthropic-version: 2023-06-01` (the header the official Anthropic SDK sends), and top-level `output_config.effort` of `"low"` or `"high"`. `max_tokens` is `4096` because the Messages API requires it; the docs' examples use 512 and 1024, which is short for a full page.
- `TINKER_BASE_URL` overrides only the OpenAI-compatible base. The Anthropic base stays the documented URL.
- Sketch uploads are PNG/JPEG data URIs. The OpenAI body uses an `image_url` part. The Anthropic body uses a base64 image source. A failed OpenAI attempt, including a vision rejection, falls through to Anthropic. This path is untested live.
- Cost uses $0.30 / 1M fresh input, $0.03 / 1M cached input (`usage.prompt_tokens_details.cached_tokens` when present), and $1.00 / 1M output. Missing usage becomes a labelled character/4 estimate. Anthropic cache fields are documented as always null, so that path prices input at the fresh rate.
- Age gate held. `openai@7.52.0` (2026-11-05) installed; `7.53.0` is inside the 3-day window and was not used. `bunfig.toml` was not weakened. Scaffold came from `create-vite@9.3.4` (`react-ts`, `--no-immediate`); dependency versions were then pinned to the plan before `bun install`. shadcn `4.23.0` preset `nova` / base (style `base-nova`).
