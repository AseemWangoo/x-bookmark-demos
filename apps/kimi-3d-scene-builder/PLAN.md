# Kimi 3D Scene Builder: PLAN

Sources: [Kimi K3.1 Pro quickstart](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart) · [API overview](https://platform.kimi.ai/docs/api/overview) · [Chat Completions reference](https://platform.kimi.ai/docs/api/chat) · [Streaming guide](https://platform.kimi.ai/docs/guide/utilize-the-streaming-output-feature-of-kimi-api) · [Model parameter reference](https://platform.kimi.ai/docs/api/models-overview) · [Pricing](https://platform.kimi.ai/docs/pricing/chat) · [Kimi blog: Introducing Kimi K3.1 Pro](https://www.kimi.ai/blog/kimi-k3-1-pro) (2026-10-23) · [Artificial Analysis launch note](https://artificialanalysis.ai/articles/kimi-k3-1-pro-launch-benchmarks) · [bookmark, @Smlay_ero](https://x.com/Smlay_ero/status/2113681692640915951) · [X trending topic](https://x.com/i/trending/2113194116553257028)

## What Kimi K3.1 Pro is (verified 2026-10-26 from Moonshot's API docs and pricing page)
- `platform.moonshot.ai` now 301-redirects to `platform.kimi.ai`, and `platform.moonshot.cn` redirects to `platform.kimi.com`. The docs below are the `platform.kimi.ai` (global) docs.
- Model ids: `kimi-k3.1-pro` and `kimi-k3.1-pro-highspeed`. Moonshot says Highspeed is the same model at "about 2-3× the speed". The demo measures this itself rather than repeating the claim.
- Endpoint: `POST https://api.moonshot.ai/v1/chat/completions`. It is **OpenAI Chat Completions compatible**: base URL `https://api.moonshot.ai/v1` with the official `openai` SDK. The same base URL also serves an OpenAI-compatible `/v1/responses`, and `https://api.moonshot.ai/anthropic` serves Anthropic Messages. This demo uses Chat Completions only.
- Auth: `Authorization: Bearer $MOONSHOT_API_KEY`. The docs use the env var name **`MOONSHOT_API_KEY`** throughout. Keys from `platform.kimi.ai` and `platform.kimi.com` are not interchangeable (a mismatch gives 401).
- Access: K3.1 Pro is unlocked only after a successful top-up (minimum $1). Account tier sets concurrency, RPM, TPM, and TPD limits.
- Thinking: K3.1 Pro **always reasons**, and it can't be turned off. Top-level `reasoning_effort` is `"low"`, `"high"`, or `"max"`, and the **default is `"max"`**. Don't pass `thinking`. The response carries `reasoning_content` alongside `content`. Switching effort mid-session invalidates prefix-cache hits.
- Fixed parameters: `temperature=1.0`, `top_p=0.95`, `n=1`, and both penalties `0`. Any other value is an error, so **omit them**. `max_completion_tokens` defaults to 131072, and Highspeed has the same parameter constraints as Pro.
- Streaming: `stream: true` returns SSE `chat.completion.chunk` events:
  - `delta.reasoning_content` arrives before `delta.content`.
  - With `stream_options: { include_usage: true }`, a final chunk with `choices: []` carries the top-level `usage`.
  - The stream ends with `data: [DONE]`. The docs say to treat only `[DONE]` as completion, not `finish_reason`.
  - Some chunks may also carry `usage` on `choices[0]`, so read `chunk.usage ?? chunk.choices[0]?.usage`.
- Usage shape: `{ prompt_tokens, completion_tokens, total_tokens, completion_tokens_details: { reasoning_tokens }, prompt_tokens_details: { cached_tokens?, cache_write_tokens } }`.
  - `cached_tokens`, `cache_write_tokens`, and the uncached remainder are mutually exclusive and sum to `prompt_tokens`.
  - `completion_tokens` **includes** reasoning tokens.
- Context caching is automatic (default TTL `5m`, optional `prompt_cache_options: { mode: "implicit", ttl: "5m" | "1h" }`).
- Pricing per 1M tokens, read from the rendered official pricing table on 2026-10-26:

  | Model | Input | Output | Cached input | 5m cache write | 1h cache write |
  | --- | --- | --- | --- | --- | --- |
  | `kimi-k3.1-pro` | $2.00 | $10.00 | $0.20 | $2.00 | $4.00 |
  | `kimi-k3.1-pro-highspeed` | $4.00 | $20.00 | $0.20 | $4.00 | $8.00 |

  Pricing is flat across the 1,048,576-token context window, with no long-context tier. Prices exclude tax.
- Context window: 1,048,576 tokens. Input is text plus images (base64 or `ms://` file ids, no public URLs). The demo is text-only.
- Errors: a JSON body with `error.type` and `error.message`. Examples are `rate_limit_reached_error` (429), `resource_not_found_error` (404 for a wrong model or no access), and 401 for a bad or mismatched key.
- Architecture: the docs say K3.1 Pro is "a post-trained version of Kimi K3". The K3 technical report in the docs describes K3 as a **2.8T-parameter Mixture-of-Experts model with 104B activated** (16 of 896 experts). Artificial Analysis lists K3.1 Pro as 2.8T total / 104B active.
- Open weights: Moonshot says "full model weights will be released by Nov 4, 2026". As of 2026-10-26 they are **not** published.

### Corrections to the bookmark framing
- **"$2 in / $10 out" is the price for `kimi-k3.1-pro` only.** Highspeed costs twice as much: **$4 in / $20 out**. Cached input is $0.20 for both. The Pro vs Highspeed switch must use per-model prices, because Highspeed is faster and also 2× more expensive per token.
- **"Mixture-of-experts, about 2.8T"** is documented for K3, the base model. For K3.1 Pro it is inferred from "post-trained version of K3", and Artificial Analysis states it. Moonshot's own K3.1 Pro pages say "3T-class", not 2.8T.
- **"Open weights"** are promised, not shipped. The app is API-only.

### Not verified (design around it, don't rely on it)
- **The China endpoint.** The `.cn` docs redirect to `platform.kimi.com`. Its API base URL (probably `https://api.moonshot.cn/v1`) wasn't checked. Support it only through the `MOONSHOT_BASE_URL` override, and default to `https://api.moonshot.ai/v1`. China-platform prices (likely CNY) aren't used.
- **Real latency and the 2-3× Highspeed claim.** No key was available while planning. All latency in mock mode is hand-written and labelled illustrative.
- **Whether `reasoning_effort: "max"` passes the `openai` npm SDK's TypeScript types.** OpenAI's enum may not include `"max"`. Cast at the adapter boundary if needed. The same goes for reading `reasoning_content`, which is not in the SDK types (the docs say so).
- **Whether `prompt_tokens_details.cached_tokens` is always present.** The doc examples show only `cache_write_tokens`. Treat missing fields as 0.
- **Code quality for this exact prompt contract.** Moonshot shows impressive three.js demos, but those were agentic, multi-step builds. One-shot quality under our restricted `kit` API is unknown until a live run.
- **The X sources.** x.com returns 403 to the fetcher. The @Smlay_ero tweet text was read through `api.fxtwitter.com` (2026-10-23 17:19 UTC). It matches the docs on model ids, reasoning effort, 1M context, and the Nov 4 weights date. The trending page (`/i/trending/…`) couldn't be read at all.
- **Rate limits per tier.** Cap the server at 2 concurrent upstream calls per instance and surface 429s.

Any of these that turns out different should need a change in one file: **`server/kimi.ts`** (adapter: base URL, model ids, request body, stream parsing, usage normalisation). Prices live in `src/lib/pricing.ts`, which is the only other place with Moonshot numbers.

## Goal
Build a one-screen app. You type a scene prompt (for example "a low-poly lighthouse on a rocky island at sunset"), Kimi K3.1 Pro writes procedural three.js code, and the scene renders live in a sandboxed iframe next to the code. Follow-up edits ("make the water reflective", "add seagulls") rewrite the current code. A Pro/Highspeed switch shows measured latency, tokens, and estimated cost for every turn. Runtime errors offer a one-click **Fix it** retry.

## Single-user MVP
In:
- **Prompt bar.**
  - A textarea plus **Generate** (first turn) or **Apply edit** (once a scene exists), and **New scene** to reset.
  - Example chips: the 3 mock prompts, plus their edits once a scene is loaded.
  - A model `ToggleGroup`: **Pro** (`kimi-k3.1-pro`) or **Highspeed** (`kimi-k3.1-pro-highspeed`). It applies to the next turn.
  - An effort `Select`: low, high, or max. The default is **high**, not the API default `max`, which keeps turns interactive. The UI says "API default is max".
- **Live scene** (left, large): the sandboxed iframe (see Sandbox), with a status chip (rendering, error, or timed out), orbit controls, and a **Reset camera** button.
- **Code panel** (right):
  - a read-only view of the current code with line numbers (`<pre>` with a light highlighter; see Stack)
  - tabs **Code**, **Diff** (changes in the last turn, via `diff`'s `diffLines`), and **Reasoning** (streamed `reasoning_content`, collapsed by default)
  - a **Copy** button
  - While a turn streams, the Code tab shows code as it arrives. The scene re-runs only when the turn completes.
- **Turn history** (bottom strip, a shadcn `Table`), one row per turn:
  - kind (`generate` / `edit` / `fix`), prompt, model, and effort
  - **TTFT** (time to first token of any kind) and **time to first code token**
  - **total latency**
  - prompt / cached / cache-write / completion / reasoning tokens
  - **estimated cost**
  - a status (ok / runtime error / fixed)
  - Clicking a row restores that version of the code into the scene (no branching: later turns stay in the list but greyed out).
  - The footer totals cost for the session.
  - Every timing in mock mode is labelled "illustrative". In live mode it is labelled "measured on the server".
- **Fix it.** When the sandbox reports an error, a red callout shows the phase (`compile` / `build` / `frame` / `timeout` / `blocked`), the message, and the line. **Fix it** sends a `fix` turn with the current code and the error, using the same model and effort. There is no automatic retry loop: one click, one request.
- **Generation contract** (`server/prompt.ts`, one system prompt shared by all turns):
  - The model returns exactly one fenced ```` ```js ```` block containing the **body** of `function build(kit)`. No `import`, no `export`, no network, and no DOM outside `kit`.
  - Allowed APIs:
    - `kit.THREE`, `kit.scene`, `kit.camera`, `kit.renderer`
    - `kit.onFrame((dt, t) => …)`
    - `kit.random(seed)`, a seeded PRNG for repeatable scenes
    - `kit.setSky(topColor, bottomColor)`
    - `kit.addControls()`, which is a no-op because orbit controls are always on
  - Budget: under 400 lines, at most about 50k triangles, procedural geometry and materials only (no textures from URLs, no loaders).
  - **Edit turns are stateless.** The request is `system` plus one `user` message holding the current code and the edit instruction, and the model returns the **full replacement code**. This avoids carrying `reasoning_content` across turns (the docs require the complete assistant message when you do), keeps the prompt prefix cacheable, and keeps token counts per turn honest.
  - `fix` turns use the same shape, plus the error text.
  - `extractCode(content)` takes the **last** ```` ```js ````/```` ```javascript ```` fence. If there is no fence, it uses the whole content when it looks like code; otherwise it returns a "no code returned" error.
- **Mock mode** (automatic when `MOONSHOT_API_KEY` is missing, and selectable from the header when a key is present):
  - An amber header badge reads **Mock: hand-written examples, no API calls**, and a banner says the code was written by hand to illustrate the flow, not generated by Kimi.
  - `fixtures/mock-scenes.ts` holds 3 scenes, each with 2 edits, written by hand against the `kit` contract:
    1. "a low-poly lighthouse on a rocky island at sunset" → "make the water reflective" (a `MeshStandardMaterial` with low roughness and an env-ish sky gradient, no textures) → "add seagulls" (instanced V-shaped birds circling on `onFrame`)
    2. "a cozy campfire in a pine forest at night" → "add fireflies" → "make the fire flicker more"
    3. "a floating island of glowing crystals" → "make it rotate slowly" → "add a waterfall off the edge"
  - One mock edit (seagulls, first attempt) **deliberately throws** at runtime (`ReferenceError: wingGeo is not defined`). Its matching mock `fix` returns the corrected code, so the Fix it path works without a key.
  - Each mock turn carries `synthetic: true`, hand-picked `usage` in the documented shape (including `reasoning_tokens` and `cache_write_tokens`), and per-model `latencyMs` / `ttftMs`. Highspeed is about 2.5× faster and the costs use the real per-model prices.
  - The server replays a mock as a **fake stream**: reasoning text, then code chunks, timed to the scaled-down mock latency. That way the streaming UI is exercised.
  - Free-text prompts in mock mode that don't match a fixture return a friendly "Mock mode only has the 3 example scenes; set MOONSHOT_API_KEY for live generation" message. They never return invented code.
  - Mock data must never appear under a **Live** badge.
- **Live mode.**
  - The server reads `MOONSHOT_API_KEY`, plus the optional `MOONSHOT_BASE_URL` (default `https://api.moonshot.ai/v1`), `KIMI_MAX_COMPLETION_TOKENS` (default 32768, which bounds time and cost), and `KIMI_DEFAULT_EFFORT` (default `high`).
  - The key stays on the server. It is never returned, logged, or bundled. `GET /api/mode` returns only `{ mode: "mock" | "live" }`.
- **Run:** `cd apps/kimi-3d-scene-builder && bun install && bun run dev`.
- **Deploy:** Vercel project rooted at `apps/kimi-3d-scene-builder`, with Node functions in `api/` (see Vercel).

Out (explicitly):
- auth, persistence or saved scenes, sharing links, multi-user, and branching history
- image or sketch input (K3.1 Pro has vision, but see Deferred)
- external assets: GLTF/texture loaders, HDRIs, and fonts from URLs. The sandbox has no network by design.
- tool calling, the Responses or Anthropic endpoints, `kimi-k3` comparisons, and the Batch API
- running both models at once in a side-by-side race (see Deferred)
- an editable code panel (read-only in the MVP)

## Sandbox (the critical piece)
The generated code is untrusted. Defence in depth, strongest layer first:
1. **Iframe isolation.** `<iframe sandbox="allow-scripts" src="/sandbox.html">`, with **no** `allow-same-origin`. That gives the frame an opaque origin: no access to the parent DOM, cookies, or storage, and no forms, popups, top navigation, or modals.
2. **CSP inside the frame** (a `<meta http-equiv>` in `sandbox.html`):

   ```
   default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'
   ```

   - `connect-src 'none'` blocks fetch, XHR, WebSocket, and EventSource. `'unsafe-eval'` is needed only for `new Function` on the generated code.
   - **Verify in task 3** that `'self'` lets the opaque-origin frame load `/sandbox/runtime.js` in Chrome and Firefox. If it doesn't, build the sandbox entry as a single inlined file (`vite-plugin-singlefile` on that entry only) and use a nonce or hash.
3. **Restricted API surface.**
   - Before running user code, the runtime deletes or overrides `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `Worker`, `SharedWorker`, `importScripts`, `navigator.sendBeacon`, `open`, `localStorage`, `sessionStorage`, `indexedDB`, and `caches`.
   - It then runs `new Function("kit", <shadowed globals>, "'use strict';\n" + code)`, passing `undefined` for `window`, `document`, `globalThis`, `self`, `parent`, `top`, and `opener`.
   - This is a convenience layer, not a security boundary. Layers 1 and 2 are the boundary.
4. **Static pre-check** (`src/sandbox/guard.ts`, a pure function run in the parent before posting the code):
   - Reject code containing `import`/`export` statements, `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `new Worker`, `document.cookie`, `localStorage`, or `eval(`, or code over 64 KB.
   - The result is a `blocked` error with the matched token, and it is offered to Fix it.
   - Comments and strings may cause false positives. That's acceptable for a demo, and the error says why.
5. **Error capture.** The runtime wraps the build in try/catch and `window.onerror`/`unhandledrejection`, and wraps each `onFrame` callback (on the first throw it stops the loop and reports). It posts `{ type: "error", runId, phase, message, stack, line }`. The line is mapped back to the user code by subtracting the wrapper's line offset.
6. **Watchdog.**
   - The frame posts `ready` after a successful build and a `heartbeat` about once a second from the rAF loop.
   - With no `ready` within 8 s, or no heartbeat for 4 s, the parent **destroys and recreates the iframe** and reports `timeout` (infinite loops, huge geometry).
   - Recent Chrome puts sandboxed iframes in a separate process, but this isn't guaranteed everywhere, so the README notes that a tight synchronous loop can still freeze the tab in some browsers.
7. **Messaging.**
   - Parent → frame: `{ type: "run", runId, code }` via `postMessage(…, "*")`. The frame origin is `"null"`, and the code isn't secret.
   - Frame → parent: the parent accepts messages only when `event.source === iframe.contentWindow` and `runId` matches the current run.
   - Each run recreates the iframe, so there is never any leftover state.
   - The renderer is created in the frame with `preserveDrawingBuffer: false`, sized to the frame, with pixel ratio capped at 2.

## API contract (app-internal)
- `GET /api/mode` returns `{ mode: "mock" | "live" }`.
- `GET /api/examples` returns the mock prompts and their edit chips: `[{ id, prompt, edits: string[] }]`.
- `POST /api/turn` takes `{ kind: "generate" | "edit" | "fix", prompt: string, currentCode?: string, error?: { phase, message, line? }, model: "pro" | "highspeed", effort: "low" | "high" | "max", forceMock?: boolean }`.
  - It responds with **NDJSON** (`application/x-ndjson`), one event per line:
    - `{ type: "start", model, modelId, effort, synthetic }`
    - `{ type: "reasoning", text }`
    - `{ type: "content", text }`
    - `{ type: "done", code, usage, timings: { ttftMs, firstContentMs, totalMs }, costUsd, finishReason, synthetic }`
    - `{ type: "error", status?, errorType?, message }`
  - The server measures timings with `performance.now()` from just before the upstream request.
- Validate with zod:
  - `prompt` up to 2,000 characters
  - `currentCode` up to 64 KB, and required for `edit`/`fix`
  - `error` required for `fix`
- Map 401 to "bad or mismatched key (platform.kimi.ai vs platform.kimi.com)", 404 to "model not available on this account (K3.1 Pro needs a $1 top-up)", and 429 to "rate limited". Otherwise show `error.message`.

## Adapter (the single point of truth for API shapes)
`server/kimi.ts` exports:
- `KIMI_MODELS = { pro: "kimi-k3.1-pro", highspeed: "kimi-k3.1-pro-highspeed" }` and `DEFAULT_BASE_URL = "https://api.moonshot.ai/v1"`, each with a source-URL comment.
- `buildChatRequest({ model, effort, messages, maxCompletionTokens })` returns the exact body:
  - `{ model, messages, reasoning_effort, max_completion_tokens, stream: true, stream_options: { include_usage: true } }`
  - It never sends `temperature`, `top_p`, `n`, penalties, or `thinking`.
- `streamChat(client, body, onEvent)` uses `client.chat.completions.create(body)` from the `openai` SDK with `baseURL`.
  - It folds `delta.reasoning_content` (read untyped) and `delta.content`.
  - It reads `usage` from `chunk.usage ?? chunk.choices[0]?.usage`, and it tolerates the final `choices: []` chunk.
  - It records TTFT and time to first content.
  - It treats the SDK iterator ending (which follows `[DONE]`) as completion.
- `normalizeUsage(raw)` returns `{ prompt, cached, cacheWrite, uncached, completion, reasoning, total }`. Missing details count as 0, and `uncached = prompt − cached − cacheWrite`, clamped at ≥ 0.
- `parseSseText(text)` is a pure SSE line parser, used by tests and as the fallback if the SDK path misbehaves (plain `fetch` + `ReadableStream`).

Any new field needs a source link in a code comment. `server/prompt.ts` (system prompt + message builders) and `src/lib/pricing.ts` are the only other files that know anything Moonshot-specific.

## Tasks (vertical slices, in order)
1. **Scaffold + guardrail.**
   - Create `apps/kimi-3d-scene-builder/bunfig.toml` FIRST:
     ```toml
     [install]
     minimumReleaseAge = 259200
     ```
   - Run `bunx create-vite@latest . --template react-ts` without installing, then `bun install`.
   - Add Tailwind v4 and run `bunx shadcn@latest init` with the minimalist (neutral) preset.
   - `bun add three openai zod diff` and `bun add -d @types/three`.
   - Check `bun pm ls`: `openai` should be 7.x (7.43.0 is the newest that clears the 3-day rule as of 2026-10-26), and `three` 0.186.x.
   - Done when `bun run dev` shows a blank page.
2. **Bun API + mock mode end to end.**
   - `server/index.ts` runs `Bun.serve` routes for `/api/mode`, `/api/examples`, and `/api/turn`, calling shared handlers in `server/http.ts`. Vite `server.proxy` forwards `/api`.
   - `bun run dev` uses `bun run --parallel dev:web dev:api`, the same as decisions-triage.
   - A mock lighthouse prompt streams NDJSON into the Code tab.
3. **Sandbox runtime.**
   - Make `sandbox.html` a second Vite entry (`build.rollupOptions.input`). `src/sandbox/runtime.ts` bundles `three` and `OrbitControls` and implements `kit`, the global lockdown, error capture, and the heartbeat.
   - `src/scene/SceneFrame.tsx` owns the iframe lifecycle, the watchdog, and message validation.
   - Verify the CSP `'self'` question and the no-network claim. In the frame, `fetch` must be undefined, and a raw `new Image().src = "https://example.com/x.png"` must be blocked by CSP (`img-src` doesn't allow it).
   - Done when all 3 mock scenes render.
4. **Edits, diff, history.**
   - Add edit chips, the full-replacement edit flow, the Diff tab, and the turn history table with restore.
   - Add shadcn components on demand: `button`, `textarea`, `toggle-group`, `select`, `tabs`, `table`, `badge`, `card`, `tooltip`, `scroll-area`, `alert`, `sonner`.
5. **Errors + Fix it.** Add `guard.ts`, the error callout, and the `fix` turn. The deliberately broken mock seagulls edit errors, Fix it repairs it, and the history shows `runtime error` → `fixed`.
6. **Live Kimi.** Add `server/kimi.ts` (the adapter above), `server/prompt.ts`, and `server/env.ts`, plus the concurrency cap of 2 and the error mapping. If a key is available, run all 3 example prompts plus edits on both models and note real timings in the PR.
7. **Metrics + pricing.** `src/lib/pricing.ts` holds per-model prices with the source URL and "checked 2026-10-26". The cost formula is `uncached×input + cached×cachedInput + cacheWrite×write5m + completion×output` (reasoning is already inside `completion`). `src/lib/metrics.ts` holds the session totals and Pro vs Highspeed averages shown in the history footer.
8. **Vercel.**
   - `api/mode.ts`, `api/examples.ts`, and `api/turn.ts` export `GET`/`POST` returning Web `Response`s, the turn handler returning a streaming `ReadableStream` body. They call the same `server/http.ts` handlers as Bun.
   - Mocks are static TS imports, never disk reads at runtime.
   - Add `vercel.json` and `engines.node: "22.x"`, and use `tsconfig.server.json` as in decisions-triage.
9. **Polish + docs.**
   - Empty state with the example chips.
   - A note that Moonshot claims 2-3× faster for Highspeed at 2× the token price, and that these are your measured numbers.
   - App `README.md` covering what it is, run commands, env vars, mock vs live, the sandbox model and its limits, the verified and unverified API notes, pricing sources, and Vercel settings.
   - Append one row to the root README **Demos** table.
10. **Validate + PR.** Record the artifacts, commit `media/demo.mp4`, and open exactly ONE PR (see Validation).

## Structure
```
apps/kimi-3d-scene-builder/
  bunfig.toml  package.json  vite.config.ts  vercel.json  index.html  sandbox.html  README.md  PLAN.md
  api/
    mode.ts  examples.ts  turn.ts   # Vercel Node functions → server/http.ts
  server/
    index.ts      # Bun.serve routes (local dev)
    http.ts       # shared Request → Response handlers (Bun + Vercel), NDJSON stream
    env.ts        # MOONSHOT_API_KEY etc.; mode detection
    kimi.ts       # ADAPTER: model ids, base URL, request body, stream folding, usage
    prompt.ts     # system prompt (kit contract) + generate/edit/fix message builders
    code.ts       # extractCode()
    mock.ts       # fake-stream replay of fixtures with scaled timings
    schema.ts     # zod TurnRequest + event types
  fixtures/
    mock-scenes.ts  # 3 scenes × (generate + 2 edits) + broken edit + its fix; synthetic: true
  src/
    App.tsx  main.tsx
    prompt/       # PromptBar, ExampleChips, ModelToggle, EffortSelect
    scene/        # SceneFrame (iframe lifecycle, watchdog), ErrorCallout
    code/         # CodePanel (Code / Diff / Reasoning tabs)
    history/      # TurnHistory table + totals
    sandbox/      # runtime.ts (in-frame kit + lockdown), guard.ts (static pre-check), protocol.ts
    lib/          # api.ts (NDJSON reader), pricing.ts, metrics.ts, types.ts
    components/ui/* # shadcn (generated)
  media/demo.mp4  # committed validation video
```

## Stack (one line each)
- **Bun**: the repo-standard runtime. `Bun.serve` keeps the key server-side in local dev.
- **Vite + React 19 + TS** (`bunx create-vite --template react-ts`): a one-screen app, same as the other demos. The second HTML entry for the sandbox is native to Vite.
- **three.js** (+ `three/addons` OrbitControls): it is what the model is asked to write, and it is bundled into the sandbox runtime, so the frame needs no CDN.
- **shadcn/ui (minimalist) + Tailwind v4**: repo standard. Tabs, Table, ToggleGroup, and Alert cover the UI.
- **`openai` SDK with `baseURL`**: Moonshot documents it as the supported client, and it handles SSE parsing. It sits behind the adapter so it can be swapped for `fetch`.
- **`diff`**: a prebuilt line diff for the Diff tab. No custom diff code.
- **Code display**: a plain `<pre>` with line numbers in the MVP. Add `shiki` highlighting only if it clears the release-age rule and doesn't bloat the bundle. A code editor (CodeMirror or Monaco) is deferred because the panel is read-only.
- **zod**: validates the turn request and the mock fixture shapes.
- **Vercel Node functions (`api/*.ts`)**: the decisions-triage pattern. Thin wrappers over `server/http.ts`, and the turn function streams.

## Vercel
Root directory `apps/kimi-3d-scene-builder`, production branch `main`. `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "bun install",
  "buildCommand": "bun run build",
  "outputDirectory": "dist"
}
```
- Pin Node with `"engines": { "node": "22.x" }` in `package.json`. Do **not** set `bunVersion`. Leave functions on the Node runtime.
- Mock mode needs no env vars. Live mode needs `MOONSHOT_API_KEY` (and optionally `MOONSHOT_BASE_URL`) as Vercel env vars.
- `dist/sandbox.html` and its runtime chunk must be in the build output. Check that `vite build` emits both entries.
- Timeouts: a `max`-effort turn can run for minutes. Defaults are effort `high` and `max_completion_tokens` 32768. If a live turn exceeds the project's function duration limit, add `"functions": { "api/turn.ts": { "maxDuration": 300 } }` and note it in the PR. Record the longest measured turn in the PR.
- Optional hardening: serve the sandbox CSP as an HTTP header via `vercel.json` `headers` for `/sandbox.html`. The meta tag is enough for the MVP.

## Testing / hooks
- `bun test`, for critical logic only:
  1. `extractCode` takes the last `js`/`javascript` fence, handles no fence, an empty fence, and prose-only output, and strips a stray `export default`.
  2. `parseSseText` and `streamChat` folding:
     - a recorded-shape SSE fixture (taken from the docs' example: reasoning chunks, content chunks, `finish_reason: "stop"`, a usage chunk with `choices: []`, then `[DONE]`) gives the right reasoning text, content, and usage
     - usage on `choices[0]` is also picked up
     - a stream cut before `[DONE]` is reported as incomplete
  3. `buildChatRequest` sets `stream`, `stream_options.include_usage`, `reasoning_effort`, and `max_completion_tokens`, maps `pro`/`highspeed` to the exact model ids, and **never** includes `temperature`, `top_p`, `n`, penalties, or `thinking`.
  4. `normalizeUsage` and `pricing.ts`:
     - uncached = prompt − cached − cacheWrite
     - reasoning tokens are not double-billed (they're inside `completion`)
     - Highspeed costs exactly 2× Pro for identical uncached usage
     - cached input is $0.20/M on both models
  5. `guard.ts` blocks `fetch(`, `import …`, `new WebSocket`, `localStorage`, and oversized code, and allows each mock scene.
  6. **Every mock scene and edit builds** against a Node stub `kit` with real `three` (no renderer: the scene graph only). Each adds at least one mesh to `scene` without throwing, except the deliberately broken edit, which must throw `ReferenceError`. Its fix must pass.
  7. Handlers: with no `MOONSHOT_API_KEY`, `/api/turn` streams `synthetic: true` events and never constructs an OpenAI client. `/api/mode` never includes the key. Invalid bodies return 400.
- The iframe sandbox and CSP are verified manually in the browser (task 3) and shown in the video. They aren't unit-tested.
- Git hooks: none (demo app).

## Acceptance criteria
- [ ] With **no env vars**, `bun install && bun run dev` starts, the header shows **Mock: hand-written examples**, and all 3 example prompts render a scene with no network calls to Moonshot.
- [ ] The code streams into the panel, then the scene renders. The Diff tab shows what an edit changed, and the Reasoning tab shows the streamed reasoning text.
- [ ] Edit chips change the existing scene (the lighthouse gets reflective water, then seagulls).
- [ ] The broken mock edit shows an error callout with phase and line. **Fix it** sends a `fix` turn and the scene renders. History shows the error → fixed sequence.
- [ ] Inside the frame, `fetch` is undefined and a network image load is blocked by CSP (shown in the devtools console in the video or a screenshot). The frame cannot read `parent.document` (it throws). An infinite `while(true){}` scene triggers the watchdog and the iframe is recreated (in Chrome).
- [ ] The Pro/Highspeed toggle changes the model per turn. The history shows TTFT, first-code time, total latency, token breakdown (including reasoning and cached), and estimated cost per turn with per-model prices. Mock timings are labelled "illustrative" and live ones "measured".
- [ ] With `MOONSHOT_API_KEY` set, the header shows **Live** and turns stream from `kimi-k3.1-pro` / `kimi-k3.1-pro-highspeed` through the server. The key never appears in responses, logs, or `dist/` (`rg` the build output).
- [ ] 401, 404, and 429 upstream errors show the mapped, readable messages.
- [ ] `bun test` and `bun run build` pass. `dist/` contains `index.html` and `sandbox.html`. The `api/*` handlers load under Node 22 and stream mock mode with no env.
- [ ] The diff touches only `apps/kimi-3d-scene-builder/**` plus one added row in the root `README.md` Demos table.

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running app. Record them in **mock mode** unless a real key is available, in which case add live captures too:
  - Screenshot: the lighthouse scene after both edits, with the Code tab beside it and the turn history showing Pro and Highspeed rows with latency, tokens, and cost.
  - Video, committed at **`apps/kimi-3d-scene-builder/media/demo.mp4`** and attached or linked in the PR:
    1. Generate the lighthouse (code streams, scene appears) and orbit the camera.
    2. Apply "make the water reflective", then open the Diff tab.
    3. Switch to Highspeed and apply "add seagulls". This hits the error, then click **Fix it** and the scene renders.
    4. Open the history row and restore an earlier version.
    5. Generate the campfire scene.
- Note in the PR body which captures are mock (illustrative, hand-written code) versus live (Kimi-generated, measured).
- Exactly one PR. Only `apps/kimi-3d-scene-builder/**` plus one README Demos row changed.

## Deferred (and why)
- **Side-by-side race** (the same prompt on Pro and Highspeed at once, two frames). It's the best showcase for the speed claim, but it doubles the cost and the UI. The per-turn switch and history averages are enough for the MVP.
- **Image or sketch → scene.** K3.1 Pro supports base64 vision input, but it needs upload UI and has no keyless mock path.
- **Editable code + re-run.** It needs CodeMirror/Monaco and a "manual edit" turn kind. Read-only keeps the model the author.
- **Multi-turn conversation with preserved thinking.** Stateless full-code edits are simpler and cheaper to reason about. Revisit if edit quality suffers.
- **Exporting GLB or sharing a link.** It needs persistence or `GLTFExporter` plumbing that's off the core path.
- **Self-hosted open weights.** They aren't released yet (promised by 2026-11-04), and a 2.8T MoE isn't a local-demo target anyway.
- **The China endpoint** (`platform.kimi.com`). It's unverified, so it's only reachable via the `MOONSHOT_BASE_URL` override.
