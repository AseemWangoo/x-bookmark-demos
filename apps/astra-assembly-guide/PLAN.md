# Astra Assembly Guide: PLAN

Sources (read 2026-11-18):

- [Introducing GPT-6.2 Astra and Sol](https://openai.com/index/introducing-gpt-6-2-astra-sol/) (launch blog; RC-buggy assembly-guide / parts-catalog demo)
- [GPT-6.2 Astra model page](https://developers.openai.com/api/docs/models/gpt-6.2-astra.md)
- [GPT-6.2 Sol model page](https://developers.openai.com/api/docs/models/gpt-6.2-sol)
- [Using GPT-6.2](https://developers.openai.com/api/docs/guides/latest-model.md)
- [Fast mode](https://developers.openai.com/api/docs/guides/fast-mode.md) and [openai.com/api-fast-mode](https://openai.com/api-fast-mode/)
- [Ultrafast mode](https://developers.openai.com/api/docs/guides/ultrafast-mode.md)
- [Pricing](https://developers.openai.com/api/docs/pricing.md)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs.md)
- [Images and vision](https://developers.openai.com/api/docs/guides/images-vision.md)
- [Counting tokens](https://developers.openai.com/api/docs/guides/token-counting)
- [API changelog, 17 Nov 2026](https://developers.openai.com/api/docs/changelog)
- Launch posts: [@OpenAI](https://x.com/OpenAI/status/2122750124543926515) (2026-11-17 11:24 PM IST), [@OpenAIDevs](https://x.com/OpenAIDevs/status/2122752500877144461) (2026-11-17 11:33 PM IST)
- npm registry publish times for `openai`, `three`, `@react-three/fiber`, `@react-three/drei` (age gate = 3 days)

## Goal

A one-screen assembly desk inspired by OpenAI's GPT-6.2 Astra RC-buggy demo: paste a parts list or build steps, or upload a photo, and get structured parts + steps + an explode layout. A three.js canvas plays an animated exploded view; a catalog lists the parts. The same job can run on **Astra** and **Sol** side by side, with a **Standard / Fast / Ultrafast** service-tier pick, and each pane shows tokens, latency, and USD cost. Mock mode is the default when no key is set.

This is a browser three.js approximation of that idea, not a recreation of OpenAI's CAD / Blender output. Label that honestly.

## Verified API facts (GPT-6.2 Astra & Sol)

### Model IDs and modalities

- Official IDs: **`gpt-6.2-astra`** (flagship) and **`gpt-6.2-sol`** (everyday / lower cost). Confirmed on both model pages, the launch blog, the 17 Nov 2026 changelog, and the @OpenAIDevs post: "In the API, use gpt-6.2-astra and gpt-6.2-sol."
- Both accept **text and image** inputs and produce **text**. Supported features include `streaming`, `structured_outputs`, `function_calling`, `image_input`, `prompt_caching`. Audio and video are unsupported. Image generation is a Responses **tool**, not a native output modality — do not use it in this MVP; the catalog is illustrated with three.js color/shape swatches, not generated photos.
- Context: 1,050,000-token window, max input 922,000, max output 128,000. Knowledge cutoffs: Astra 18 May 2026, Sol 1 Jun 2026. Both support reasoning tokens. The API **rejects** `reasoning.effort` / `reasoning_effort` set to `none`. Official migration guidance: start with `medium` for a new integration; if you currently use `none` or `minimal`, use `low`. Use `reasoning.effort` in Responses (or `reasoning_effort` in Chat Completions).
- Unsupported request params: omit `temperature`, `top_p`, and `top_logprobs` on Responses. Do not send them.

### Which API to use

- Both models support **Responses** (`v1/responses`) and **Chat Completions** (`v1/chat/completions`).
- Official "Using GPT-6.2" guide: **use the Responses API**. Tool calling requires Responses (this MVP does not call tools, but Responses is still the recommended path and is required for the documented Ultrafast HTTP / WebSocket examples).
- Prefer `client.responses.create` / `client.responses.parse` with structured outputs. Do not use Chat Completions in this demo.

### Fast and Ultrafast

- Parameter name: **`service_tier`**, on each Responses request (HTTP body). Optional matching request header: `OpenAI-Service-Tier`.
- Values to use:
  - **Standard**: `service_tier: "default"` (or omit it, which follows the project default — pin `"default"` in this demo so a project-level Fast setting cannot silently change the run).
  - **Fast**: `service_tier: "fast"`. `"priority"` is a legacy alias (renamed Fast mode on 30 Jul 2026); do not show `priority` in the UI.
  - **Ultrafast**: `service_tier: "ultrafast"`. Official Ultrafast guide and HTTP example: `client.responses.create({ model, service_tier: "ultrafast", input })`.
- The **response** `service_tier` is the tier actually used and can differ from the request (Fast traffic that hits the ramp-rate limit is downgraded and returns `service_tier: "default"`, billed at Standard). Display the returned tier, not only the requested one.
- Ultrafast also supports WebSockets (`response.create` events). Official docs recommend a persistent WebSocket for agentic, multi-tool chats. This MVP is a single structured call per model — **use HTTP**, which the Ultrafast guide documents as the supported alternative. Do not add a WebSocket client.
- Ultrafast data residency for these two models is US-only. Fast and Standard support US and EU residency. Not relevant to the local desk, but do not claim global Ultrafast residency.
- @OpenAIDevs: "Both models also support Fast and Ultrafast modes." Ultrafast is available for both at launch (launch blog).

### Pricing (per 1M tokens, short context ≤272K input)

This demo will stay well under the 272K long-context threshold. Use short-context rates in the on-screen calculator. Long-context rates (input/cache ×2, output ×1.5 for the full request when input >272K) are a footnote only.

| Model | Tier | Input | Cached input | 30m cache write | 12h cache write | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `gpt-6.2-astra` | Standard | $8.00 | $0.40 | $10.00 | $20.00 | $40.00 |
| `gpt-6.2-sol` | Standard | $2.00 | $0.10 | $2.50 | $5.00 | $10.00 |
| `gpt-6.2-astra` | Fast (2× Standard) | $16.00 | $0.80 | $20.00 | $40.00 | $80.00 |
| `gpt-6.2-sol` | Fast (2× Standard) | $4.00 | $0.20 | $5.00 | $10.00 | $20.00 |
| `gpt-6.2-astra` | Ultrafast promo | $24.00 | $1.20 | $30.00 | $60.00 | $120.00 |
| `gpt-6.2-sol` | Ultrafast promo | $6.00 | $0.30 | $7.50 | $15.00 | $30.00 |
| `gpt-6.2-astra` | Ultrafast list (from 1 Mar 2027 PT) | $48.00 | $2.40 | $60.00 | $120.00 | $240.00 |
| `gpt-6.2-sol` | Ultrafast list (from 1 Mar 2027 PT) | $12.00 | $0.60 | $15.00 | $30.00 | $60.00 |

- Fast = 2× Standard at the same context length (model pages + pricing tables).
- **Ultrafast 3-month discount**: @OpenAIDevs (17 Nov 2026): "We're cutting Ultrafast pricing by 50% for the next three months, making it available at just 3x the cost of Standard for API and Enterprise users." Official pricing page: Ultrafast costs **3× Standard through 28 Feb 2027**, and **6× Standard starting 1 Mar 2027** (Pacific time). The promotional table is the live math until that date; show the 6× list rates as a labelled footnote, not as the live calculator while the promo window is open.
- Label the cost UI **"Ultrafast promotional pricing through 28 Feb 2027 (Pacific)"**.
- Cache-write prices above are the 30-minute retention rates; 12-hour writes cost twice that at Standard (Astra $20, Sol $5) and scale with the tier. Batch and background-window discounts are out of scope.

### Structured output and JSON schema

- Both models list `structured_outputs` as a supported feature. Official Structured Outputs guide uses `gpt-6.2-astra` in the Responses examples.
- Responses path: `text: { format: { type: "json_schema", name, strict: true, schema } }`, or `openai.responses.parse` with `zodTextFormat` / a Zod schema. Prefer `responses.parse` + Zod so the server gets `output_parsed`.
- Use Structured Outputs, not JSON mode (`json_object`). Handle refusals, incomplete responses, and API errors in the adapter.

### Image input

- Official vision guide, Responses API: a user message `content` array with `{ type: "input_text", text }` and `{ type: "input_image", image_url, detail: "auto" }`.
- `image_url` may be a fully qualified URL, a Base64 data URL, or a Files API file ID. This desk should send a `data:image/(png|jpeg|webp);base64,…` URL from the upload (cap decoded size, e.g. 10 MB, and a long side of at most 2048, same spirit as the Terra desk).
- Images count as input tokens and are billed accordingly. There is no separate GPT-6.2 image-input rate on the pricing page (the Images tables are for GPT Image generation models). **Use the API-reported `usage.input_tokens`**; do not invent a per-image surcharge.

### Usage fields (Responses API)

Read from `response.usage` (snake_case in the REST payload):

- `input_tokens`
- `input_tokens_details.cached_tokens`
- `input_tokens_details.cache_write_tokens` (and optional `cache_write_tokens_details` for TTL)
- `output_tokens` — includes reasoning and other non-visible tokens; official token-counting guide: do not treat visible text length as the billable output
- `output_tokens_details.reasoning_tokens` — **display only**; a subset of `output_tokens`. Do **not** add them on top or cost will be double-counted.
- `total_tokens`
- Also record `response.service_tier` and wall-clock latency (`performance.now()` around the request).

Cost formula (short-context, selected tier rates):

`costUsd = freshInput * inputRate + cachedInput * cachedRate + cacheWrites * writeRate + output * outputRate`, per 1M.

`freshInput = input_tokens - cached_tokens`. If `cache_write_tokens` is missing, treat writes as 0. If the write TTL is 12h, use the 12h write rate; otherwise the 30m rate. If usage is missing, fall back to a labelled estimate and say so in the UI.

### SDK pin and age gate

- Latest `openai` on npm is **7.59.0** (published 2026-11-17 22:54:03 UTC / 2026-11-18 4:24 AM IST). **7.58.0** (2026-11-17 18:31:10 UTC / 2026-11-18 12:01 AM IST) is the first release that adds typed model identifiers for `gpt-6.2-astra` and `gpt-6.2-sol`.
- Both are **under the 3-day gate** as of this plan (`minimumReleaseAge = 259200`). They become eligible at 2026-11-20 18:31 UTC (7.58.0) and 2026-11-20 22:54 UTC (7.59.0) — 2026-11-21 12:01 AM IST and 4:24 AM IST.
- Age-compliant pin: **`openai@7.57.0`** (published 2026-11-13 21:27:35 UTC / 2026-11-14 2:57 AM IST). It already supports `responses.create` / `responses.parse`, `service_tier` (`fast` / `ultrafast` / `default`), structured outputs, and image inputs. Pass the new model IDs as **string literals**. If the 7.57.0 typings reject the model string, use a narrow assertion or a typed helper — do not upgrade past the gate. Raw `fetch` to `https://api.openai.com/v1/responses` is the fallback only if the pinned SDK cannot send the request.
- **Never weaken** `apps/astra-assembly-guide/bunfig.toml` `[install] minimumReleaseAge = 259200`. If `bun install` hard-fails the gate, stop and report.

### Auth

- Server reads **`OPENAI_API_KEY`**. The official client picks it up from the environment. The key stays on the server and must never be sent to the browser, written into client bundles, or logged. Optional `OPENAI_MODEL_ASTRA` / `OPENAI_MODEL_SOL` (defaults `gpt-6.2-astra` / `gpt-6.2-sol`) and a `MOCK=1` override.

## Open questions (do not invent; isolate behind the adapter)

1. **Whether a personal `OPENAI_API_KEY` can invoke `gpt-6.2-astra` / `gpt-6.2-sol` and Ultrafast** (model access, usage tier, Ultrafast rate limits). Mock mode must work with no key. If a live Ultrafast call is rejected, surface the error, keep Standard / Fast available, and record it in Implementation notes. Do not silently downgrade the requested tier.
2. **Exact runtime usage shape** on the pinned `openai@7.57.0` typings vs the live payload, especially `cache_write_tokens` and whether short prompts populate `cached_tokens`. Cost UI must degrade to a labelled estimate when fields are missing.
3. **Image-token packing formula for GPT-6.2** is not spelled out on the model pages the way older vision models are. Do not estimate image tokens up front; trust `usage.input_tokens`.
4. **Whether 7.57.0 typings include `"ultrafast"` / the new model IDs.** Expected: `service_tier` already includes Ultrafast (shipped with GPT-6 Astra); model IDs may need a string assertion.

## Age-compliant pins (bunfig minimumReleaseAge = 259200)

Feature pin: **`openai@7.57.0`**. 3D: **`three@0.187.0`** (2026-10-30), **`@react-three/fiber@9.8.2`** (2026-10-14), **`@react-three/drei@10.7.9`** (2026-09-25). Scaffold pins matching Carbon / Inkling and registry ages: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7` (or the create-vite default if it resolves age-compliant), `@vitejs/plugin-react@5.2.0`, `typescript@5.8.3`, `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `@types/bun@1.4.4`, `@types/node@24.19.2`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0`. Prefer an exact pin for `openai` and the three.js set; caret ranges are fine for ordinary UI deps once install proves age-compliant.

## Single-user MVP

In:

- **Input pane**: textarea for a parts list or build steps, plus an optional photo upload. Seed with **two recorded fixtures** — (1) a small RC-buggy-style parts list + steps (inspired by OpenAI's launch demo, clearly labelled as a hand-authored fixture, not official output), (2) a second everyday kit (for example a furniture or lamp build). The user can also paste their own list or upload a photo.
- **Model compare**: side-by-side **Astra | Sol** panes. A primary action runs **both** models on the same input (two server calls, can be parallel). Optional "run this side only" is fine; the video should show a dual run.
- **Service-tier pick**: Standard / Fast / Ultrafast, mapped 1:1 to `service_tier: "default" | "fast" | "ultrafast"`. Default **Standard**. The same tier applies to both sides of a compare run.
- **Exploded view**: a three.js / R3F canvas that animates parts between assembled and exploded positions from the returned layout. Play / pause, an explode slider, orbit controls, click-to-highlight a part. Primitive meshes only (`box` / `cylinder` / `sphere` / `cone`) from the JSON — no uploaded CAD, no GLTF requirement.
- **Parts catalog**: a grid or list of parts (name, qty, short description, color swatch). Clicking a row highlights the mesh and can seek the matching assembly step.
- **Metrics** on each pane: requested vs actual `service_tier`, latency ms, input / cached / output / reasoning tokens, computed USD with the promo-price label. If both sides ran, a small delta (Sol cheaper / slower, etc.) is welcome but not required.
- **Two clearly separated modes:**
  - **Live** (`OPENAI_API_KEY` set, no `MOCK=1`): real Responses calls through an isolated server-side adapter. Never expose the key to the browser.
  - **Mock (default, no key)**: deterministic recorded assemblies with canned latency / token / cost numbers, clearly badged **"Mock mode — recorded outputs, no OpenAI calls"**. Fixtures must look distinct on Astra vs Sol (for example slightly different part breakdown or step wording) so the compare video reads. Never claim mock meshes or catalog copy came from Astra or Sol. Uploading an unknown photo in mock mode should not invent a new assembly — show a "Live mode needed to read your own photo. Set `OPENAI_API_KEY`." message and keep the image preview (same honesty rule as the Terra desk).
- **Mode banner** with exact live setup: set `OPENAI_API_KEY`, optional model overrides, `bun install && bun run dev`.
- **Run:** `cd apps/astra-assembly-guide && bun install && bun run dev` (mock by default). Tests pass in CI with no key.
- The cloud agent appends **one row** to the root README Demos table and includes at least one screenshot **and** one video of the running **mock** desk in the PR (dual panes, explode animation, catalog, labelled metrics, mock badge).

Out: auth/accounts, multi-user, storing runs, Blender / CAD / GLTF export, generated catalog photography, WebSocket Ultrafast, Chat Completions path, tool calling / computer use, Batch or background windows, deployment, long-context pricing as live math, official benchmark claims in the UI, claiming this is OpenAI's original RC-buggy asset.

## Architecture

```
Vite + React + shadcn desk
  InputPane + TierToggle ──▶ POST /api/assemble ──▶ server/assemble.ts
  ExplodeCanvas (R3F) + PartsCatalog + MetricsPane
       ◀── JSON AssembleResult (one per model)

server/
  adapter/types.ts    AssembleRequest { sourceText?, imageDataUrl?, fixtureId?,
                                       models: ('astra'|'sol')[],
                                       serviceTier: 'default'|'fast'|'ultrafast' }
                      AssembleResult { assembly, latencyMs, usage?, costUsd,
                                       requestedTier, actualTier, source: 'live'|'mock',
                                       model }
  adapter/openai.ts   isolated Responses client (model ids from env/default)
  adapter/mock.ts     labelled fixtures; same AssembleResult shape
  cost.ts             short-context rate table + promo/list Ultrafast constants
  schema.ts           Zod assembly schema (parts, steps, explode layout)
  env.ts              OPENAI_API_KEY presence → mode; MOCK=1 override

shared/
  fixtures/           2 kits + recorded Astra/Sol assemblies + meta.json
                      (tokens / latency / cost / service tier)
```

One adapter interface drives both modes so the panes behave identically. Keep SDK / wire details inside `adapter/openai.ts`. Put stable instructions and the JSON schema description in a **developer message as the first `input` item** (GPT-6.2 appends top-level `instructions` after `input`, which would miss the prompt cache). Default `reasoning: { effort: "low" }` for this interactive extraction; document that `none` is rejected and that official guidance starts at `medium`. Do not add an effort toggle in the MVP.

Suggested assembly schema (strict JSON Schema / Zod): `title`, `summary`, `parts[]` (`id`, `name`, `qty`, `description`, `color`, `shape`, `size[3]`, `assembledPosition[3]`, `explodedPosition[3]`), `steps[]` (`n`, `title`, `instruction`, `partIds[]`). Keep it strict (`additionalProperties: false`, all fields required) so Structured Outputs can enforce it.

## Stack (one line each)

- **Bun**: repo standard for install, scripts, tests, and the HTTP API.
- **Vite + React + TS** (`bunx create-vite`, skip install, write `bunfig.toml` before `bun install`): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, Textarea, ToggleGroup or Tabs, Tooltip, Sonner on demand.
- **openai@7.57.0** (server-only): Responses API, structured outputs, `service_tier`.
- **three + @react-three/fiber + drei**: animated exploded view and orbit / highlight.
- **zod**: request/response and assembly-schema validation.

## Tasks (vertical slices)

1. Scaffold the app with `bunx create-vite` (skip install), write `bunfig.toml` with `minimumReleaseAge = 259200` **before** any install, pin the dependency set, prove `bun install` and `bun run build`.
2. Implement the adapter interface, Zod assembly schema, mock adapter + two fixtures with distinct Astra/Sol recordings, and the cost helper with unit tests (tier rate table including the Ultrafast promo window, no double-counting of reasoning tokens, fresh vs cached input, mock badge fields, image-upload rejection in mock when there is no fixture).
3. Build the input pane, Standard / Fast / Ultrafast pick, side-by-side panes, explode canvas, parts catalog, mode banner, and an end-to-end mock compare (animation, catalog highlight, metrics, labelled mock badge).
4. Implement live `adapter/openai.ts`: Responses `parse` / `create` with `text.format` json_schema, `service_tier`, image `input_image` data URLs, usage → cost mapping, env-configurable model ids. Typecheck without a key. `/api/mode` must never include the key. Document exact live setup and any remaining open questions honestly in README / Implementation notes after the first successful live call (or state live is untested).
5. Validate the production build and tests (`bun test` must pass with no key); capture a screenshot and a video of the running **mock** desk showing a fixture compare, the explode animation, the catalog, labelled metrics, and the mock badge. If `OPENAI_API_KEY` is available, also verify live Standard (and Fast / Ultrafast if the key allows) and report the returned `service_tier` and usage shape; otherwise state live is untested.

## Build constraints (cloud agent)

- Touch **only** `apps/astra-assembly-guide/` plus **one** new row in the root README Demos table. Do not edit other apps, skills, or tracker files. Never create a new repo.
- Open **one PR** against `https://github.com/AseemWangoo/x-bookmark-demos` (this repo). Include at least **one screenshot AND one video** of the running app.
- Do not weaken `bunfig.toml` `minimumReleaseAge = 259200`. Do not bump `openai` to 7.58.0 / 7.59.0 until those publish dates clear the 3-day gate.
- Honest labelling of mock vs live in the UI, README, and PR body.

## Deferred

Chat Completions path, tool calling / computer use, WebSocket Ultrafast, image-generation catalog photos, GLTF / CAD / Blender export, saved history, deployment, Batch / background windows, a user-facing reasoning-effort toggle, official AA-3D or other benchmark numbers in the UI.

## Post notes

Honest framing: a browser assembly desk inspired by OpenAI's GPT-6.2 Astra RC-buggy demo (animated guide + illustrated parts catalog); live path calls `gpt-6.2-astra` and `gpt-6.2-sol` via the Responses API with Standard / Fast / Ultrafast; the video uses mock / recorded outputs if no `OPENAI_API_KEY` was available. Tag at most three verified handles (likely `@OpenAI` and `@OpenAIDevs` — confirm the live accounts at post time; do not invent handles). Do not claim the meshes are OpenAI's original assets or that mock catalogs were model-generated.
