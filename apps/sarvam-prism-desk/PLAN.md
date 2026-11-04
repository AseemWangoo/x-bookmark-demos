# Sarvam Prism Desk: PLAN

Sources (all read 2026-11-04):
- [Sarvam Prism model page](https://docs.sarvam.ai/api/token-factory/models/sarvam-prism) (`.md` version read: model id, request/response, limits, pricing, error table, known limitations)
- [Decisions API guide](https://docs.sarvam.ai/api/token-factory/decisions-api) (question types, multi-question requests, the "act on confidence" pattern, SDK versions)
- [API reference: Decide (Sarvam Prism)](https://docs.sarvam.ai/api-reference/decisions/systemone) (`POST /v2/systemone`, auth headers, answer schemas)
- [API reference: Text Translation](https://docs.sarvam.ai/api-reference/text/translate-text) and [Mayura](https://docs.sarvam.ai/api/api-guides-tutorials/models/mayura) (optional live translate, `POST /translate`)
- [Hugging Face: sarvamai/prism](https://huggingface.co/sarvamai/prism) (open weights, Apache-2.0, speed figures, hardware)
- [Sarvam blog: Introducing Sarvam Prism](https://www.sarvam.ai/blogs/sarvam-prism) (2026-11-03)
- npm: [`sarvamai`](https://www.npmjs.com/package/sarvamai) and [`sarvam-ai-sdk`](https://www.npmjs.com/package/sarvam-ai-sdk) (`npm view <pkg> time`; `dist/index.d.ts` of `sarvam-ai-sdk@0.4.6` and `0.4.7` read on jsDelivr)
- Bookmark: [@SarvamAI launch post](https://x.com/SarvamAI/status/2117621415520448838) (2026-11-03 14:14 UTC = 19:44 IST): "Sarvam Prism, a System One model built on Sarvam 105B … scores 71.8 with a median response time of 44 milliseconds, the highest average score among decision models that respond in under 100 milliseconds." Read through the X API.

## What Sarvam Prism is (verified 2026-11-04)
- **A decision model, not a chat model.** You send a `state` and a map of typed questions; it returns a calibrated probability for every option. No text is generated, so `usage.output_tokens` is always `0`. Built on Sarvam 105B (a LoRA fine-tune per the HF card). Launched 2026-11-03.
- **Endpoint:** `POST https://api.sarvam.ai/v2/systemone`, `Content-Type: application/json`.
- **Auth:** header `api-subscription-key: $SARVAM_API_KEY` (the docs also accept `Authorization: Bearer $SARVAM_API_KEY`). Use `api-subscription-key`.
- **Model id: `sarvam-prism`** (case-sensitive; an unknown id returns `404`). Read it from `PRISM_MODEL` (default `sarvam-prism`).
- **Request body** (only these three top-level fields):
  ```json
  { "model": "sarvam-prism",
    "state": "<string | object | array>",
    "questions": {
      "escalate": { "type": "noul", "instructions": "…", "criteria": { "true": "…", "false": "…" } },
      "team":     { "type": "choice", "instructions": "…", "criteria": { "payments": "…", "technical": "…" } },
      "urgency":  { "type": "score",  "instructions": "…", "criteria": ["low", "normal", "high", "critical"] } } }
  ```
  - Question `type` is `noul` (yes/no), `choice` (2–255 options, `criteria` = option id → description) or `score` (2–10 levels, `criteria` = list, lowest first). A question accepts **only** `type`, `instructions`, `criteria`; any other key (even a typo like `instruction`) is `422`.
  - `temperature`, `max_tokens`, `stream`, `images` are refused (`422`; image URLs `400`). No streaming, no images.
- **Response:**
  ```json
  { "model": "sarvam-prism",
    "answers": {
      "urgent":     { "type": "noul", "noul": 0.9782 },
      "department": { "type": "choice", "choice": "billing", "confidence": 0.7065,
                      "probabilities": { "billing": 0.8044, "technical": 0.1869, "sales": 0.0087 } },
      "severity":   { "type": "score", "score": 3.832, "confidence": 0.916,
                      "legend": { "0": "trivial", "1": "minor", "2": "moderate", "3": "major", "4": "critical" },
                      "probabilities": { "0": 0.0026, "1": 0.0034, "2": 0.0115, "3": 0.1245, "4": 0.8581 } } },
    "usage": { "input_tokens": 153, "output_tokens": 0 } }
  ```
  (Verbatim from the docs; use it as a test fixture.) `noul` = P(yes). `choice` = top option id. `confidence` (choice) = `(p_top − 1/n)/(1 − 1/n)`, **not** a probability. `score` = expected level `Σ index × p` (0-based float). Each question's probabilities sum to 1.
- **Act on confidence (documented pattern):** threshold the **top probability** (`noul` or `probabilities[choice]`), not `confidence`. Docs example threshold `0.9`. At 0.9, ~68.5% of English answers clear the bar vs ~38.4% in Indian languages ("Prism is more cautious"), so more Indic messages go to a person. The demo surfaces this directly.
- **Languages:** "English, 10 Indian languages, and Hinglish" (API page). HF card tags: `en hi bn ta te mr gu kn ml or pa`.
- **Limits:** 32,768 tokens per question (state + that question), never truncated; no cap on number of questions; 60 s per request (`503 model_overloaded` beyond). Probabilities can vary slightly between identical requests; the top answer is stable.
- **Errors:** `{ "error": { "message", "code", "request_id", "param"? } }`. `400 invalid_request_error`, `402 insufficient_quota_error`, `403 invalid_api_key_error`, `404 not_found_error`, `422 unprocessable_entity_error`, `429 rate_limit_exceeded_error`, `500`, `502 model_call_failed`, `503 model_overloaded`. Retry only 429/502/503 with backoff.
- **Pricing:** **₹4 per 1M input tokens, ₹0 output**, on every plan. Cost per request = `usage.input_tokens × 4 / 1e6` ₹.
- **Claims (Sarvam's, show as claims):** 71.8 average over three indices (Jev Decision Index 67.0, recreated AA Decision Index 65.9, **Indian-language benchmark 82.5**); **median 44 ms per request, p95 420 ms, on one NVIDIA B200**, 1,000 requests sent one at a time (HF card). That is model-side time on a local GPU; the hosted API adds network and queueing. The app shows measured numbers next to the 44 ms reference and says so.
- **Open weights:** `sarvamai/prism` on Hugging Face, **Apache-2.0**, ~106 GB, needs one FP8 GPU with ~120 GB (B200/H200), custom loader `prism.py` (not `AutoModelForCausalLM`/vLLM). Note: the self-hosted `prism.py` format differs from the hosted API (`yes_no` → `{ yes }`, score adds `level`; hosted uses `noul` and `legend`/`confidence`). This app targets the **hosted API shape only**.

### SDKs (decided: plain `fetch`)
- Official `sarvamai` JS SDK has `client.decisions.create(...)` from **1.1.15**, published 2026-11-03 10:11 UTC. Under the repo's 3-day `minimumReleaseAge` it is not installable until ~2026-11-06 15:41 IST.
- `sarvam-ai-sdk` (the AI SDK provider, repo `sarvamai/sarvam-ai-sdk`, needs `ai@7`): `0.4.6` has **no** decision support. `0.4.7` (2026-11-03 18:52 UTC) adds `sarvam.decisionModel("sarvam-prism")` via the AI SDK's `experimental_decide` / `Experimental_DecisionModelV4`. Also blocked by the 3-day rule (~2026-11-07 00:22 IST) and experimental.
- So **`server/prism.ts` calls the REST endpoint with `fetch`**. One small adapter, every field above, no SDK dependency. Swapping in `sarvamai` later is a one-file change.

### Not verified (design around it)
- **Which 10 Indian languages the hosted API means.** Assume the HF tags above. Fixtures only use Hindi, Tamil, Bengali, Telugu, Marathi (all in that list) plus English and Hinglish.
- **Server timing headers.** None documented. Measure wall-clock in the Bun server with `performance.now()` around `fetch` (the "Sarvam round trip") and separately in the browser (the "end-to-end" time). Log `request_id` when present; never require timing headers.
- **Rate limits for `/v2/systemone`.** Not published on the pages read. Live typing is debounced and only one request is in flight per desk; 429 shows a toast and backs off.
- **Real live latency from the builder VM.** Unknown and untestable (no key). The UI never claims 44 ms was achieved unless the measured number says so.

`server/prism.ts` (adapter) and `src/lib/pricing.ts` are the only files that should change if any of this differs.

## Goal
A one-screen support desk: type or paste a customer message in Hindi, Hinglish or English, and Sarvam Prism routes it **as you type**. One request asks three questions (team, urgency, escalate). The desk shows calibrated probability bars, an **auto-route vs human review** verdict at a 0.9 threshold, a per-request **latency meter against the 44 ms claim**, the ₹ cost, and a one-click language strip that shows the same message in Hindi, Tamil, Bengali, Telugu, Marathi, Hinglish and English and re-routes it, so you can see the routing hold (and the confidence get more cautious) across Indic languages.

### How this differs from Decisions Triage (apps/decisions-triage)
| | Decisions Triage | Sarvam Prism Desk |
| --- | --- | --- |
| Interaction | batch of 10 inbox messages, "Run triage" | **one live message, classified on every keystroke (debounced)** |
| Focus | throughput, cost per batch, OpenAI Decisions vs Responses | **latency per request vs a 44 ms claim, Indic languages, open weights** |
| Languages | English only | **Hindi (Devanagari), Hinglish (romanized), English + 4 more Indic languages** |
| Output use | table + agreement with expected labels | **routing card with auto-route/human-review at 0.9**, mirroring Sarvam's documented pattern |
| Model | `gpt-6-luna`, closed | `sarvam-prism`, **Apache-2.0 open weights** panel |
| Cost | $ per 1K messages | ₹ per request and per 1 lakh messages |
Do not copy code, fixtures or layout from decisions-triage.

## Single-user MVP
In:
- **Composer** (shadcn `Textarea`): live classification, debounced **200 ms** after the last keystroke, minimum 6 non-space characters. Only the latest request matters: the browser aborts the previous fetch with `AbortController`, and the server aborts its upstream `fetch` when the client disconnects. Shows a small "routing…" pulse while in flight. Enter does not submit; there is no submit button.
- **Preset chips** (6 messages). Each preset has hand-written variants in `en`, `hinglish`, `hi`, `ta`, `bn`, `te`, `mr` (`fixtures/presets.ts`, all fictional, Indian context, no real companies or people):
  1. UPI payment debited but order shows failed, ₹2,499 (payments, high, escalate likely)
  2. App crashes on login after the update, OTP never arrives (technical, high)
  3. "Mera KYC 3 din se pending hai" / KYC stuck (account_kyc, normal)
  4. Delivery late by 5 days, wants status (orders_delivery, normal, no escalate)
  5. Someone else logged into my account and changed the bank details (account_kyc or technical: **deliberately ambiguous**; critical, escalate yes)
  6. Bulk pricing for 200 seats for a college (sales, low)
- **Language strip** (shadcn `ToggleGroup`): `English · Hinglish · हिन्दी · தமிழ் · বাংলা · తెలుగు · मराठी`. Clicking one swaps the composer text to that variant of the current preset and re-routes immediately. Each language keeps a mini result chip (team + top p + ms) so you can compare at a glance. For free-typed text (not a preset) the strip is disabled in mock mode with a tooltip "Translations of your own text need live mode". In live mode it may call Mayura (optional milestone 7).
- **Routing card** (the main output), one row per question:
  - **Team** (`choice`): horizontal probability bars for every option (`payments`, `technical`, `account_kyc`, `orders_delivery`, `sales`), the top one highlighted, with `p_top` and the API's `confidence` shown separately and labelled.
  - **Urgency** (`score`, levels `low · normal · high · critical`): a 4-segment bar of per-level probabilities plus the expected level (`score`, e.g. 2.4) and its rounded label from `legend`.
  - **Escalate** (`noul`): a single P(yes) bar with a yes/no verdict at 0.5.
  - **Verdict badge:** **Auto-route → <team>** when `probabilities[choice] ≥ AUTO_THRESHOLD` (default 0.9, slider 0.5–0.99), else **Human review**. The threshold applies to the top probability, as the docs say. A small note: "Sarvam reports ~68.5% of English vs ~38.4% of Indic answers clear 0.9."
- **Latency meter** (the speed story):
  - A big number for the last request: **Sarvam round trip (server-measured)** in ms, plus end-to-end browser time in smaller text.
  - A horizontal gauge from 0 to 500 ms with a marker at **44 ms ("Sarvam claim: median on one B200")** and one at 100 ms ("decision models under 100 ms").
  - A sparkline of the last 30 requests with live **p50 / p95** and request count.
  - Mock values are labelled **synthetic latency**.
- **Cost line:** input tokens, ₹ for this request, and ₹ per 1,00,000 messages at this size (`src/lib/pricing.ts`, ₹4 / 1M input, ₹0 output, source URL in a comment and a tooltip).
- **Open weights panel** (a small `Card`, static): "Apache-2.0 on Hugging Face (`sarvamai/prism`), ~106 GB, one FP8 GPU with ~120 GB (B200/H200)", a link to the model card, and a note that this app uses the hosted API and the self-hosted output format differs slightly. No downloads.
- **Raw JSON drawer** (shadcn `Sheet`): the exact request body sent and the response received (or replayed) for the last call. The key is never in it.
- **Mode handling:**
  - `SARVAM_API_KEY` unset (**the default for this build**): header badge **Mock: synthetic fixtures**, banner "No API calls are made. Probabilities and latencies are synthetic."
  - `SARVAM_API_KEY` set: badge **Live: sarvam-prism**. A header switch can force mock (`MOCK=1` also forces it).
- **Mock mode (default, must carry the whole demo and video):**
  - **Replay:** every preset × language variant has a hand-written response in the exact documented shape in `fixtures/mock-responses.ts`, keyed by `sha1(normalize(text))` (NFC, trimmed, whitespace collapsed). Each has `synthetic: true`, a plausible `usage.input_tokens`, and probabilities that sum to 1. Indic variants get slightly lower top probabilities than English for the same preset (mirroring Sarvam's own caution note), and the ambiguous preset 5 stays under 0.9 everywhere so it lands in Human review.
  - **Live typing in mock:** text that is not an exact fixture goes through `server/mock-scorer.ts`, a **deterministic keyword scorer** with a small multilingual lexicon (English, romanized Hinglish, Devanagari, plus a few Tamil/Bengali/Telugu/Marathi keywords) → logits → softmax per question → the same response shape. Same text gives the same output, always. The UI shows "Mock heuristic (not Prism)" on these results so nobody mistakes them for model output. Partial preset text (while the capture "types" a preset) uses this scorer; when the text completes it hits the replay fixture.
  - **Synthetic latency:** a seeded function of the text hash yields values with median ≈ 45 ms and a long tail (p95 ≈ 300–420 ms), and the server actually waits that long (`MOCK_SPEED` divides it), so the meter moves realistically. Labelled synthetic everywhere.
- **Live mode:** the Bun server calls `POST /v2/systemone` with the key from env. The key never leaves the server: not returned, logged, or bundled. `GET /api/mode` returns only `{ mode, model }`.
- **Run:** `cd apps/sarvam-prism-desk && bun install && bun run dev`.

Out (explicitly): auth, persistence, ticket history, a real helpdesk integration, batches, editing the questions in the UI, self-hosting the open weights, speech input, deployment, and any comparison against another model.

## Architecture
```
browser (Vite + React 19 + shadcn)
  Composer ─debounce 200ms + AbortController─▶ POST /api/route ─┐
  LanguageStrip ─(preset variant swap)───────▶ POST /api/route ─┤
  [live, optional] ──────────────────────────▶ POST /api/translate
                                                                 ▼
Bun.serve (server/, :8787; Vite :5173 proxies /api)
  http.ts   zod-validate { text, lang?, presetId?, forceMock? } (≤ 4,000 chars)
  env.ts    SARVAM_API_KEY present && !MOCK → live, else mock
  questions.ts  single source of the 3 questions (team / urgency / escalate)
  prism.ts  ADAPTER: buildRequest(text) → fetch api.sarvam.ai/v2/systemone
            (header api-subscription-key), t0/t1 performance.now(), parse with zod,
            map errors by status + error.code, pass AbortSignal through
  normalize.ts  raw answers → RoutingResult (by question id, never by index)
  mock.ts   fixture replay by text hash → else mock-scorer.ts; synthetic latency wait
  translate.ts  [optional, live only] POST api.sarvam.ai/translate, mayura:v1
```
- `POST /api/route` returns `{ mode, model, result: RoutingResult, raw: { request, response }, serverMs, usage, costInr, synthetic, source: "live" | "fixture" | "mock-heuristic", requestId? }` or `{ error: { status, code, message } }`.
- `RoutingResult = { team: { choice, pTop, confidence, probabilities }, urgency: { score, level, label, confidence, probabilities, legend }, escalate: { pYes, verdict }, autoRoute: boolean }`. `autoRoute` is computed on the client from the threshold slider, not stored.
- The browser measures end-to-end time around its own fetch; the server reports `serverMs` (upstream only in live; the synthetic wait in mock).

## Stack (one line each)
- **Bun**: repo-standard runtime, package manager, test runner, and `Bun.serve` API that keeps the key server-side.
- **Vite + React 19 + TS** (`bunx create-vite --template react-ts`): a one-screen tool, same as the previous demos.
- **shadcn/ui (minimalist) + Tailwind v4**: Textarea, ToggleGroup, Card, Badge, Slider, Progress, Sheet, Tooltip, Switch, Sonner on demand.
- **Plain `fetch` to `/v2/systemone`**: the official SDK and the AI SDK provider releases with Prism support are both under 3 days old; the REST shape is small and fully documented.
- **zod**: validates `/api/route` bodies and parses Sarvam responses and error envelopes.
- **Hand-rolled SVG/CSS bars and sparkline**: a few divs and one `<polyline>`; no chart library.
- **Playwright (dev) + ffmpeg**: scripted screenshot and video so validation media is reproducible.

## File layout
```
apps/sarvam-prism-desk/
  bunfig.toml  package.json  vite.config.ts  index.html  components.json  README.md  PLAN.md  .gitignore
  server/
    index.ts  http.ts  env.ts  questions.ts  prism.ts  normalize.ts  mock.ts  mock-scorer.ts  latency.ts  translate.ts  schema.ts
  fixtures/
    presets.ts          # 6 presets × 7 language variants (hand-written, fictional)
    mock-responses.ts   # documented response shape per variant, synthetic: true
    docs-example.json   # the verbatim docs response above (test fixture)
  scripts/
    capture.ts          # Playwright: screenshot + video → media/
  src/
    App.tsx  main.tsx  index.css
    desk/      Composer.tsx  PresetChips.tsx  LanguageStrip.tsx
    routing/   RoutingCard.tsx  ProbBars.tsx  UrgencyBar.tsx  EscalateBar.tsx  Verdict.tsx
    speed/     LatencyMeter.tsx  Sparkline.tsx
    info/      OpenWeightsCard.tsx  RawSheet.tsx  ModeBadge.tsx
    lib/       api.ts  pricing.ts  stats.ts (p50/p95)  types.ts  useDebouncedRoute.ts
    components/ui/*   # shadcn (generated)
  tests/  prism.test.ts  normalize.test.ts  mock.test.ts  fixtures.test.ts  pricing.test.ts  http.test.ts  stats.test.ts
  media/screenshot.png  media/demo.mp4
```

## Env vars
| var | default | notes |
| --- | --- | --- |
| `SARVAM_API_KEY` | (none) | set → live; unset → mock (default for this build). Server-only. |
| `PRISM_MODEL` | `sarvam-prism` | verified id |
| `SARVAM_BASE_URL` | `https://api.sarvam.ai` | for tests/proxies |
| `MOCK` | (none) | `1` forces mock even with a key |
| `MOCK_SPEED` | `1` | divides synthetic latency (keep `1` for the video so the meter is honest to the fixture values) |
| `AUTO_THRESHOLD` | `0.9` | initial slider value |
| `PORT` | `8787` | API; Vite on 5173 proxies `/api` |

## Milestones (vertical slices, in order)
1. **Scaffold + guardrail.** Create `apps/sarvam-prism-desk/bunfig.toml` FIRST (`[install]` / `minimumReleaseAge = 259200`). `bunx create-vite@latest . --template react-ts` without installing, then `bun install`. Tailwind v4 + `bunx shadcn@latest init` (minimal, neutral). `bun add zod`; `bun add -d playwright @types/bun`. Do **not** add `sarvamai` or `sarvam-ai-sdk`. `bun run dev` = `bun run --parallel dev:web dev:api` like the other apps. Done when a blank page loads.
2. **Questions + adapter + normalize (no network).** `questions.ts`, `prism.ts` `buildRequest`, `normalize.ts`, zod schemas, and tests against `fixtures/docs-example.json`.
3. **Mock end to end.** Presets + variants, `mock-responses.ts`, `mock-scorer.ts`, synthetic latency, `/api/mode` and `/api/route`. Clicking a preset fills the composer and shows a routing result under the **Mock** badge.
4. **Routing card + verdict.** Probability bars, urgency bar, escalate bar, threshold slider, Auto-route/Human review badge, raw JSON sheet.
5. **Live typing + speed.** Debounced hook with abort, latency meter with 44 ms / 100 ms markers, sparkline, p50/p95, cost line in ₹.
6. **Language strip.** Variant swap for presets, per-language mini chips, disabled state for free text in mock. Open weights card.
7. **Live adapter + optional translate.** Real `fetch` path with error mapping (402 "credits empty", 403 "bad key", 404 "set PRISM_MODEL", 422 shows `param`, 429/502/503 toast + single backoff retry). Optional: `/api/translate` using `POST /translate` (`mayura:v1`, `source_language_code: "auto"`, ≤ 1,000 chars, response `translated_text`) to fill the strip for free text in live mode. **No key exists for this build**, so live is untested; say so in the README and PR.
8. **Polish + docs.** Empty state, loading pulse, toasts. App `README.md`: what it is, sources, run, env, mock vs live, verified API details (endpoint, header, model id, shapes), claims vs measured, pricing, open-weights note, SDK version note. Append one row to the root README Demos table.
9. **Capture + PR.** `bun run capture` and one PR (see Validation).

## Testing (critical logic only, `bun test`, no network, no key)
1. **`buildRequest`**: exact body = `{ model, state, questions }`; every question has only `type`/`instructions`/`criteria`; team has 5 options, urgency 4 levels, escalate `noul` with `true`/`false` criteria; never includes `temperature`, `max_tokens`, `stream`, `images`. Header is `api-subscription-key`.
2. **`normalize`**: the verbatim docs example parses; mapping is by question id; `pTop = probabilities[choice]`; urgency label = `legend[String(Math.round(score))]`; unknown answer types are surfaced, not crashed on.
3. **Fixtures honesty**: every mock response matches the documented zod schema, has `synthetic: true`, `output_tokens: 0`, probabilities sum to 1 (±1e-3), `choice` is the argmax, `confidence` matches `(p_top − 1/n)/(1 − 1/n)` within 0.01, and preset 5 has `pTop < 0.9` in every language. Every preset has all 7 variants.
4. **Mock scorer**: deterministic (same text → identical output), valid shape, handles Devanagari and romanized Hindi keywords (e.g. "paisa kat gaya" → payments), empty-ish text is rejected upstream.
5. **Pricing + stats**: 153 tokens → ₹0.000612; per-lakh math; p50/p95 on known arrays.
6. **Handlers**: with no `SARVAM_API_KEY`, `/api/route` never calls `fetch` (spy) and returns `synthetic: true`; `/api/mode` never includes the key; bad bodies → 400; a mocked upstream 403/422/429 error envelope maps to the right `{ status, code, message }`.
- UI is checked manually and in the video. Git hooks: none.

## Acceptance criteria
- [ ] With **no env vars**, `bun install && bun run dev` starts, shows **Mock: synthetic fixtures**, and makes no requests to `api.sarvam.ai`.
- [ ] Typing in the composer updates team/urgency/escalate within one debounce; stale requests are aborted (only the latest result renders).
- [ ] Each preset routes in all 7 languages from fixtures; the language strip swaps text and re-routes in one click; per-language chips show team, top p and ms.
- [ ] Probability bars show every option; `p_top` and `confidence` are labelled separately; the verdict uses `p_top ≥ threshold`, and preset 5 shows **Human review**.
- [ ] Latency meter shows last ms, p50/p95, a 44 ms claim marker and a sparkline; mock numbers say **synthetic**.
- [ ] Cost shows input tokens and ₹ at ₹4/1M with a source link.
- [ ] Open weights card links `huggingface.co/sarvamai/prism` and states Apache-2.0.
- [ ] With `SARVAM_API_KEY` set, `/api/route` calls `POST https://api.sarvam.ai/v2/systemone` with `api-subscription-key` and `model: sarvam-prism`; the key never appears in responses, logs or `dist/` (`rg` the build output).
- [ ] `bun test` and `bun run build` pass.
- [ ] The diff touches only `apps/sarvam-prism-desk/**` plus one added row in the root `README.md` Demos table.

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running app, both in **mock mode** (no key is available):
  - **Screenshot** `media/screenshot.png` (1280×800): preset 1 in Hinglish, the routing card with bars, the verdict badge, the latency meter with the 44 ms marker and a filled sparkline, and the language strip with several chips filled. Embed it in the PR body.
  - **Video** `media/demo.mp4` (H.264, **~20–40 s, 1280×800**). Record with `bun run capture`: Playwright `recordVideo` → webm → `ffmpeg -c:v libx264 -pix_fmt yuv420p -movflags +faststart`. Commit it and link or attach it in the PR. Script:
    1. App loads; the Mock badge and banner are visible.
    2. Type a Hinglish message character by character (~60 ms/char); bars and the latency meter update live.
    3. Click हिन्दी → தமிழ் → বাংলা → English on the language strip; results re-route and the chips fill in.
    4. Click preset 5 (account takeover): it lands in **Human review**, escalate yes, critical.
    5. Drag the threshold slider; the verdict flips. Open the raw JSON sheet briefly.
    6. End on the latency meter (p50/p95 + 44 ms marker) and the open weights card.
- The PR body states: **mock mode** (hand-written `synthetic` responses, a keyword heuristic for free text, synthetic latency); the verified endpoint, header and model id with source links; that live mode is untested because no key was available; and the one command to go live (`SARVAM_API_KEY=… bun run dev`).
- Exactly one PR. Only `apps/sarvam-prism-desk/**` plus one README Demos row changed.

## Risks and fallback
| risk | likelihood | mitigation |
| --- | --- | --- |
| No API key for the builder | certain | Mock mode is the default and carries the full demo, tests and video. Fixtures follow the documented shape exactly and are badged synthetic. |
| Mock looks like real model output | medium | Badge + banner; "Mock heuristic (not Prism)" on free-text results; `synthetic: true` in every payload; PR says so. |
| Live latency far above 44 ms (network from the user's location, queueing) | likely | Show measured server and end-to-end ms next to the claim marker, and explain the claim is GPU-side on a B200. Never fake live numbers. |
| SDK versions blocked by `minimumReleaseAge` | certain today | Plain `fetch` adapter; note in README how to switch to `sarvamai ≥ 1.1.15` later. |
| Keystroke traffic hits rate limits | medium (live) | 200 ms debounce, min length, one in-flight request with abort, single backoff retry on 429. |
| Indic fixture translations are imperfect | medium | Keep messages short and simple; label them hand-written synthetic text; optional Mayura translate in live. |
| Hosted vs open-weights format drift (`noul` vs `yes_no`) | low | Target hosted only; zod parse failure shows a clear error with the raw body. |

## Deferred (and why)
- **Self-hosting the open weights** (`prism.py`): needs a B200/H200-class GPU. The card links it instead.
- **Batch routing / inbox view**: that is the Decisions Triage demo's story.
- **Speech input** (Sarvam STT) and spoken replies: on-brand but doubles the surface.
- **Model comparison** (Prism vs another decision model): needs a second key and harness.
- **Deployment**: a hosted deploy would be mock-only, and live needs key management.
- **Switching to `sarvamai` / `sarvam-ai-sdk`**: after 2026-11-07 once they clear the release-age rule, if it removes code.
