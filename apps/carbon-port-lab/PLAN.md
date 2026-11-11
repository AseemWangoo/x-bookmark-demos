# Carbon Port Lab: PLAN

Sources (read 2026-11-11):
- [What's new in Gemini 4 Carbon](https://aistudio.google.com/docs/whats-new-gemini-4-carbon)
- [Gemini 4 Carbon model page](https://aistudio.google.com/docs/models/gemini-4-carbon)
- [Gemini 4 Carbon now available on AI Gateway](https://vercel.com/changelog/gemini-4-carbon-now-available-on-ai-gateway) (published 2026-11-10)
- [AI Gateway model page](https://vercel.com/ai-gateway/models/gemini-4-carbon)
- [AI Gateway Google / Vertex reasoning](https://vercel.com/docs/ai-gateway/models-and-providers/reasoning/google)
- [AI Gateway authentication](https://vercel.com/docs/ai-gateway/authentication-and-byok)
- [AI SDK with AI Gateway](https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk)
- [AI SDK Google provider](https://ai-sdk.dev/providers/ai-sdk-providers/google)
- [AI SDK 7 migration guide (usage shape)](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- Launch / benchmark chatter: [X story](https://x.com/i/trending/2120289483031556475), [TekonBurns CursorBench 4.0 post](https://x.com/TekonBurns/status/2120204822695805048) (third-party; not independently verified)
- npm registry publish times for the pinned dependency set (age gate = 3 days)

## Goal
A one-screen port lab: paste a small legacy snippet (old JS, Python, or BASIC — a tiny game loop or utility), pick **Low / Medium / High** thinking, and Gemini 4 Carbon ports it into a self-contained HTML canvas app. The source and the ported canvas sit side by side; the canvas runs live in a sandboxed iframe. Each run shows latency, tokens, and computed USD cost. The interaction is the demo: same snippet, tunable reasoning depth, a playable port.

## Verified API facts (Gemini 4 Carbon / AI Gateway / AI SDK)
- **Official Gemini API model id**: `gemini-4-carbon` (stable). Google describes it as its strongest / most capable reasoning model, aimed at sustained agentic coding, multimodal knowledge work, scientific reasoning, and cybersecurity. Paid Gemini API tier only (not Free tier). Unified 1,048,576-token context window; default synchronous max output 65,536, long decode up to 1,048,576. Thinking is supported. Explicit context caching is **not** supported; implicit caching is.
- **AI Gateway model id**: `google/gemini-4-carbon`. Providers listed as `google` and `vertex`. Context / max output listed on the Gateway model page as 1,000,000. Confirmed on the 2026-11-10 Gateway changelog and the canonical model page.
- **How to call it (preferred path)**: Vercel AI SDK through AI Gateway. Install the `ai` package. Use `generateText` or `streamText` with the model string `'google/gemini-4-carbon'`. A string model id routes through AI Gateway automatically. Server-only; never ship the key to the browser.
  ```ts
  import { generateText } from 'ai'

  const result = await generateText({
    model: 'google/gemini-4-carbon',
    instructions: 'Return a single self-contained HTML document…',
    prompt: legacySnippet,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: 'medium', // 'low' | 'medium' | 'high'
          includeThoughts: true,
        },
      },
    },
  })
  ```
  AI SDK 7 renamed the system prompt option to `instructions` (`system` still works as a deprecated fallback). Prefer `instructions`.
- **Thinking / effort**: Google documents tunable thinking levels **`low` | `medium` | `high`** for Carbon, default **`medium`**, same per-token price at every level. Native Gemini field is `thinking_level` / `generation_config.thinking_level`. Through the AI SDK + AI Gateway, pass **`providerOptions.google.thinkingConfig.thinkingLevel`** (`'low' | 'medium' | 'high'`). Optional `includeThoughts: true` if a collapsed reasoning drawer is wanted. Do **not** use `thinkingBudget` (that is for Gemini 2.5). Do **not** send `temperature` / `top_p` / `top_k` — Google says Carbon ignores them. The demo toggle is exactly these three levels. Google's Carbon docs do **not** list `minimal`; do not offer it.
- **Do not use the top-level AI SDK `reasoning` option for this toggle.** AI Gateway's shared effort mapping, documented for Gemini 3-family models, maps `low` → `low` and other effort levels → `high`, which would collapse Medium into High. `thinkingConfig` in `providerOptions` takes precedence and requests the native level. Whether that shared mapping also applies to Gemini 4 Carbon is an open question; the native option avoids it.
- **Pricing** (intro through **30 Nov 2026**, then the higher rate from **1 Dec 2026**). Google and Vercel both document the intro $2 / $10 figures. Vercel also labels the Gateway listing "50% off through November 30, 2026" and says Gateway reflects provider pricing with no markup and no inference platform fee.
  | Token class | Through 30 Nov 2026 | From 1 Dec 2026 |
  |---|---|---|
  | Input | $2.00 / 1M | $4.00 / 1M |
  | Cached input (implicit, 95% off) | $0.10 / 1M | $0.20 / 1M |
  | Output, **including thinking tokens** | $10.00 / 1M | $20.00 / 1M |
  Use the intro rates in the on-screen calculator and label them **"intro pricing through 30 Nov 2026"**. Show the post-intro $4 / $20 rates as a footnote, not as the live math while the intro window is open.
- **Cost formula (intro rates)**: `costUsd = freshInput * 2.00/1e6 + cachedInput * 0.10/1e6 + output * 10.00/1e6`. Fresh input is total input minus cached input. In AI SDK 7, read `usage.inputTokens` / `usage.outputTokens` (or `.total` if the pinned typings use a structured count), `usage.inputTokenDetails.cacheReadTokens` for cached input, and `usage.outputTokenDetails.reasoningTokens` **only as a display breakdown**. Reasoning / thinking tokens are a subset of `outputTokens` — do **not** add them on top, or cost will be double-counted. Google bills thinking tokens at the output rate. If usage is missing, fall back to a labelled estimate and say so in the UI.
- **Auth**: `AI_GATEWAY_API_KEY` in the server environment. The AI SDK reads it automatically for string model ids. Chat Completions equivalent, if ever needed: `Authorization: Bearer` against `https://ai-gateway.vercel.sh/v1`. On Vercel deployments, OIDC can replace the key when `AI_GATEWAY_API_KEY` is unset; this local Bun desk should treat **a set `AI_GATEWAY_API_KEY` as live mode** and must not depend on OIDC for the MVP. Direct Google access via `@ai-sdk/google` + `GOOGLE_GENERATIVE_AI_API_KEY` is a deferred fallback, not the primary path. Keys stay server-side only.
- **Output contract** for the iframe: the model must return a **single self-contained HTML document** (`<!DOCTYPE html>` …) with all CSS and JS inlined, drawing to a `<canvas>` (or canvas-plus-minimal DOM chrome), playable with no further setup and no required external network / CDN. If the model wraps the document in a markdown ` ```html ` fence, the adapter strips the fence and uses the inner document. Render with `iframe.srcdoc` and `sandbox="allow-scripts"` **without** `allow-same-origin`. Do not paint a partial stream into the iframe; wait for a complete document (streaming may still drive a pending / token ticker).
- **Timeouts / output budget**: Google recommends HTTP client timeouts of at least 15 minutes on hard prompts, and `max_output_tokens` of at least 32,768 because Carbon can spend a large share of the budget on thinking. For this short-snippet lab, set an explicit max output of **65,536** (the default synchronous cap) unless a live run shows that is insufficient. Long-decode / `background: true` is out of scope for the MVP.
- **CursorBench 4.0 numbers** in the scout write-up (High 60.4% at about $9.22/task, Medium 60.1%, ahead of Claude Fable 5.2 Max at 60.0% and about $32.79/task) come from a third-party X post. Do not present them as official Google or Vercel figures. They are optional flavour in the README, not product claims in the UI.

### Open questions (do not invent; isolate behind the adapter)
1. **Whether AI Gateway actually forwards `providerOptions.google.thinkingConfig.thinkingLevel` for `google/gemini-4-carbon`.** Docs cover Gemini 3 and later generally, and Google confirms `low` / `medium` / `high` on Carbon, but this path has not been run live. If a live call ignores or rejects the option, try the same shape under `providerOptions.vertex`, then stop and record what happened. Do not silently fall back to the top-level `reasoning` mapping.
2. **Exact usage field shape returned for Carbon through the pinned AI SDK + Gateway**, including whether `outputTokens` already includes thinking tokens (SDK 7 docs say yes) and whether `cacheReadTokens` is populated on short prompts (implicit cache needs a long shared prefix; these snippets likely will not hit it). Cost UI must degrade to a labelled estimate when fields are missing.
3. **Whether a personal `AI_GATEWAY_API_KEY` can actually invoke `google/gemini-4-carbon`** (model access, credits, paid-tier only). Mock mode must work with no key.
4. **Bun + AI SDK 7.** Official AI SDK 7 docs require Node.js 22+. This repo runs on Bun. If `bun install` or runtime fails on the pinned `ai` package, stop and report; do not weaken `bunfig.toml`.

### Age-compliant pins (bunfig minimumReleaseAge = 259200)
Feature pin: **`ai@7.0.165`** (published 2026-11-07; `7.0.166` and `7.0.169` are under the 3-day gate as of plan write). Do not add `@ai-sdk/google` or `@ai-sdk/gateway` unless a live-path type or runtime issue forces it; if so, the newest age-compliant pins as of this writing are `@ai-sdk/google@4.0.114` and `@ai-sdk/gateway@4.0.138` (both 2026-11-07). Scaffold pins matching the Inkling desk and registry ages: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7` (or the create-vite default if it resolves age-compliant), `@vitejs/plugin-react@5.2.0`, `typescript@~5.8.3` or `5.9.3`, `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `@types/bun@1.4.4`, `@types/node@24.19.2`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0`. Prefer an exact pin for `ai`; caret ranges are fine for ordinary UI deps once install proves age-compliant. If Bun hard-fails the age gate, stop and report; do not weaken `bunfig.toml`.

## Single-user MVP
In:
- **Source pane**: textarea for a legacy snippet, seeded with **three recorded fixtures** — (1) a tiny JS or BASIC-style game loop (for example a one-file Pong / Snake / guess-the-number loop), (2) a tiny Python utility (for example a unit or interest calculator), (3) a third small JS utility. The user can also paste their own short snippet.
- **Effort toggle**: Low / Medium / High, mapped 1:1 to `thinkingLevel`. Default Medium.
- **Port**: one click sends the snippet + effort to the server, shows a pending state, then renders the returned HTML in the canvas pane. Optionally remember the last successful result per effort so switching the toggle can show a prior run without a new call; a fresh Port always re-runs the selected level.
- **Side-by-side layout**: source on the left, sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) on the right. Header on the port pane shows effort, latency ms, input / output / reasoning tokens, and computed USD using the intro rates, with the intro-price label.
- **Two clearly separated modes:**
  - **Live** (`AI_GATEWAY_API_KEY` set): real `generateText` / `streamText` calls to `google/gemini-4-carbon` through an isolated server-side adapter. Never expose the key to the browser.
  - **Mock (default, no key)**: deterministic recorded HTML ports with canned latency / token / cost numbers, clearly badged **"Mock mode — recorded outputs, no Gemini / AI Gateway calls"**. Fixtures must look like distinct Low vs Medium vs High quality on at least one snippet so the video reads. Never claim mock HTML came from Carbon.
- **Mode banner** with exact live setup: set `AI_GATEWAY_API_KEY`, optional `AI_GATEWAY_MODEL` (default `google/gemini-4-carbon`), `bun install && bun run dev`.
- **Run:** `cd apps/carbon-port-lab && bun install && bun run dev` (mock by default).
- The cloud agent appends **one row** to the root README Demos table and includes at least one screenshot and one video of the running app in the PR.

Out: auth/accounts, multi-user, storing ports, editing HTML in-pane, running all three efforts in parallel as a default duel, long decode / background execution, direct `@ai-sdk/google` / `GOOGLE_GENERATIVE_AI_API_KEY` path, Vertex-only routing, deployment, non-HTML targets, uploading large files / multimodal inputs.

## Architecture
```
Vite + React + shadcn desk
  SourcePane + EffortToggle ──▶ POST /api/port ──▶ server/port.ts
  CanvasPane (sandboxed iframe) ◀── JSON PortResult

server/
  adapter/types.ts     PortRequest { source, language?, effort: 'low'|'medium'|'high' }
                       PortResult { html, reasoning?, latencyMs, usage?, costUsd, source: 'live'|'mock' }
  adapter/gateway.ts   isolated AI SDK + AI Gateway client (model id from env/default)
  adapter/mock.ts      labelled fixtures; same PortResult shape
  cost.ts              intro-rate calculator + post-intro footnote constants
  prompts.ts           instructions forcing a single self-contained HTML canvas document
  html.ts              fence stripping / document extraction

shared/
  fixtures/            3 legacy snippets + recorded low/medium/high HTML ports
                       (+ meta.json for tokens/latency/cost)
```
One adapter interface drives both modes so the panes behave identically. Keep Gateway / AI SDK wire details inside `adapter/gateway.ts` so open questions (thinkingLevel forwarding, usage shape, model access) stay swappable without UI churn.

## Stack (one line each)
- **Bun**: repo standard for install, scripts, tests and HTTP API.
- **Vite + React + TS** (`bunx create-vite`, skip install): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, Textarea, ToggleGroup or Tabs, Tooltip, Sonner on demand.
- **ai@7.0.165** (server-only): AI SDK string model id through AI Gateway.
- **zod**: request/response validation at the API boundary.

## Tasks (vertical slices)
1. Scaffold app + `bunfig.toml` before install; pin the dependency set; prove install/build.
2. Implement the adapter interface, mock adapter + three legacy fixtures with recorded ports, HTML extractor, and cost helper with unit tests (effort mapping, intro-rate math and no double-counting of reasoning tokens, mock badge fields, fence stripping).
3. Build the source pane, effort toggle, canvas iframe, mode banner, and an end-to-end mock port (iframe render, metrics, labelled mock badge).
4. Implement live `adapter/gateway.ts` against AI Gateway with `thinkingLevel` low/medium/high, usage → cost mapping, and env-configurable model id. Typecheck without a key. Document exact live setup and any remaining open questions honestly in README / Implementation notes after the first successful live call (or state live is untested).
5. Validate the production build and tests; capture a screenshot and a video of the running **mock** desk showing a fixture port with labelled metrics and the mock badge. If `AI_GATEWAY_API_KEY` is available, also verify live and report whether `thinkingLevel` was honoured; otherwise state live is untested.

## Deferred
Direct `@ai-sdk/google` / Gemini API key path, Vertex routing, long decode / background execution, parallel low/medium/high duel as the default layout, deployment, stored history, in-pane HTML editing, multimodal / file inputs, official benchmark claims in the UI.

## Post notes
Honest framing: built on Gemini 4 Carbon via Vercel AI Gateway; video uses mock/recorded outputs if no `AI_GATEWAY_API_KEY` was available. Tag at most three verified handles (likely Google / Gemini and Vercel — confirm the live accounts at post time; do not invent handles). Do not present CursorBench numbers as official.
