# Decisions Triage: PLAN

Sources: [OpenAI: Build more responsive apps with the Decisions API](https://openai.com/index/decisions-api) (2026-10-22) · [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) · [create-decision reference (TypeScript)](https://developers.openai.com/api/reference/typescript/resources/decisions/methods/create/index.md) · [GPT-6 Luna model page](https://developers.openai.com/api/docs/models/gpt-6-luna) · [Batch API guide](https://developers.openai.com/api/docs/guides/batch) · [bookmark, @testingcatalog](https://x.com/testingcatalog/status/2113398273352368473)

## What the Decisions API is (verified 2026-10-24 from the guide, the reference, the launch post, and the `openai` npm package)
- Generally available as of 2026-10-22. It answers bounded questions about shared input: a probability, a choice, or a score.
- Endpoint: `POST https://api.openai.com/v1/decisions` with `Authorization: Bearer $OPENAI_API_KEY`. Model: `gpt-6-luna` is the only supported model.
- SDK: `client.decisions.create(body)` in the official `openai` npm package. It is in 7.30.1 and later; 7.43.0 is current. 7.39.0 is the newest release older than the repo's 3-day `minimumReleaseAge`, and it has `decisions.create`, the three question types, `refusal` answers, and `usage`. The `input_json` part and the developer, system, and assistant message variants were typed after 7.39.0. This demo sends a plain string `input`, so it doesn't need them.
- Request body:
  - `model`
  - `input`: a string, or an ordered array of messages and tool items. User content parts are `input_text`, `input_image` (data URL or public URL, no `file_id`), and `input_json` (`data`).
  - `questions`: 1–400 per request. Answers come back in the same order.
  - Optional: `prompt_cache_key`, `prompt_cache_options` (`mode`, `ttl: "30m"`), `safety_identifier`.
- Question types (each has `type`, `instructions` (string or content parts), and an optional `name`; the name is echoed back):
  - `predicate`: no extra fields.
  - `choice`: `choices: [{ value: string | boolean, description? }]`. 2–255 unique choices.
  - `score`: `levels: [{ label, description? }]`, ordered lowest to highest. The guide says 2–10 levels. Level indices start at 0.
- Response: `{ answers: [...], model, usage }`. Each answer has `name` (string or null) and one of these shapes:
  - `predicate`: `probability`, from 0 to 1.
  - `choice`: `choice` (a supplied value), `probabilities: [{ value, probability }]`, `confidence`.
  - `score`: `score` (the probability-weighted average of the level indices, so it can fall between levels), `probabilities: [{ value, label, probability }]`, `confidence`.
  - `refusal`: `name` only. Other questions in the same request can still be answered.
  - `usage`: `{ input_tokens, input_tokens_details: { cached_tokens, cache_write_tokens }, output_tokens, output_tokens_details: { reasoning_tokens }, total_tokens }`.
- Pricing on `/v1/decisions`: $0.10 per 1M uncached input tokens, $0.01 per 1M cached input. Cache writes are billed at the standard `gpt-6-luna` rate, which the model page lists as $0.125 per 1M. **Output tokens are not charged.** Regional processing (+10%) and long-context (>272K tokens) multipliers apply.
- Speed: the guide says "about 10x faster than the Responses API". The launch post says "up to 10x faster than GPT‑6 Luna through the Responses API". These are OpenAI's claims. The demo measures its own latency and shows that instead.
- Comparison baseline (verified on the model page and in SDK types): `gpt-6-luna` on `POST /v1/responses` costs $0.10 per 1M input and $0.50 per 1M output, with `reasoning.effort` from `none` up to `max` (default `medium`). Structured output uses `text.format = { type: "json_schema", name, schema, strict }`, and the SDK exposes `response.output_text`.

### Corrections to the bookmark framing
- **"Batches of up to 400" means 400 questions per request** (up from 200 in the beta). It does not mean 400 inputs. All questions in a request share one `input`.
- **The async Batch API does not accept `/v1/decisions`.** Neither the Batch guide's endpoint list nor the `batches.create` `endpoint` type in `openai@7.43.0` includes it. Here a "batch" of inbox messages is N parallel `/v1/decisions` calls, one per message, each with 3 questions. A packed strategy (below) shows off the 400-question limit.

### Not verified (design around it, don't rely on it)
- **Per-question latency.** The response has no timing field and no per-answer usage. "Per-decision latency" in this app is the measured wall-clock time of each message's request, which covers all 3 of its questions. The UI says so. It doesn't invent a per-question split.
- **Server timing headers** (such as `openai-processing-ms`) on `/v1/decisions`. They aren't documented for this endpoint. Log one if it's present, and never require it.
- **Rate limits specific to Decisions.** The model page lists `gpt-6-luna` RPM/TPM per tier but doesn't say whether `/v1/decisions` shares them. Cap concurrency at 8 and surface 429s.
- **HTTP error body shape for this endpoint.** Assume the standard OpenAI error envelope via the SDK's `APIError` (`status`, `message`). Fall back to the status code.
- **Whether `confidence` has a documented formula.** It's typed as a number and the guide doesn't define it. Display it as reported and don't derive it.
- **The bookmark itself.** x.com returned 403 to the fetcher. A mirror (`api.fxtwitter.com`) shows the tweet text: GA, "Jev-like", the three decision types. The 10x, $0.10/M, and 400 figures were checked against OpenAI's own pages above, not against the tweet image.

Any of these that turns out different should need a change in one file: `server/decisions.ts` (adapter) or `src/lib/pricing.ts`.

## Goal
Build a one-screen inbox triage console. Load a batch of sample support tickets and emails and run every message through the Decisions API with three questions: **is this urgent?** (predicate), **route** (choice: billing, bug, sales, spam), and **priority** (score, 1–5). The console shows the answers with probabilities, per-message latency, total batch time, and estimated cost. A toggle runs the same batch through an equivalent Responses API structured-output call so you can compare speed and cost.

## Single-user MVP
In:
- **Inbox fixtures (10 messages)** in `fixtures/messages.ts`, each `{ id, channel: "email" | "ticket", from, subject, body, receivedAt }`. They're realistic but fictional (no real people or companies):
  1. Production outage: "checkout returns 500 for all EU customers since 09:12" (bug, urgent, P5)
  2. Charged twice for an annual plan, with a refund request (billing, P3)
  3. 40-seat enterprise quote and SSO question from a procurement lead (sales, P4)
  4. "Congratulations, you've won a gift card, click here" (spam, P1)
  5. Dark-mode toggle misaligned in Safari (bug, cosmetic, P1–2)
  6. Card declined, with "our service is suspended in 2 hours" from the customer (billing, urgent, P4–5)
  7. Upgrade question from a small team ("can we add 3 seats mid-cycle?") (sales or billing: deliberately ambiguous)
  8. Data export CSV is missing rows for one report; a workaround exists (bug, P3)
  9. Cold vendor pitch for SEO services (spam vs sales: deliberately ambiguous)
  10. Security report: "I can see another tenant's invoices at /billing/123" (bug, urgent, P5, though "billing" wording is a trap)
  - At least two ambiguous cases (7, 9) and one trap (10) make the probability bars worth looking at.
  - Expected labels live next to each fixture as `expected: { urgent, route, priority }`. They are hand-written ground truth for an agreement column, not model output.
- **Question set** in `server/questions.ts`. It is one constant and the only place the schema lives:
  - `urgent`: predicate. "Does this message need a human response within the next hour to prevent customer harm, data exposure, revenue loss, or an outage?"
  - `route`: choice. `billing` (payments, invoices, refunds, plan charges), `bug` (product defects, outages, security issues), `sales` (new purchases, quotes, seat expansion), `spam` (unsolicited, phishing, irrelevant).
  - `priority`: score with 5 levels, labels `P1 Trivial` … `P5 Critical`, each with a description. The API returns indices 0–4. The UI shows `score + 1` (for example 3.4) and the rounded level.
- **Inbox table** (shadcn `Table`), one row per message:
  - from, subject, and a channel badge
  - an **Urgent** badge when `probability ≥ threshold` (a slider, default 0.5), plus the % value
  - the route chip and its `confidence`, with a popover that shows `probabilities` per option
  - priority as a 1–5 meter with the fractional value, `confidence`, and a per-level probability popover
  - a **Refused** badge for any question that comes back as `refusal`
  - latency in ms for that message's request
  - ✓/✗ agreement with `expected`
  - Clicking a row opens a side `Sheet` with the full message body and the raw answers JSON.
  - Sort by priority, then urgent probability.
- **Batch run bar.** "Run triage" button, a strategy select, and a summary strip:
  - Strategy **Per message** (default): N parallel requests with concurrency 8, each `{ input: <message text>, questions: [urgent, route, priority] }`. Rows fill in as each request resolves.
  - Strategy **Packed**: one request whose `input` lists every message with its id, plus 3×N questions named `<id>.urgent`, `<id>.route`, and `<id>.priority`, each with instructions scoped to "the message with id X". This demonstrates the 400-question limit (it allows up to 133 messages) and shows a single-call latency. Guard: N×3 ≤ 400. The UI notes that packing shares context and may lower accuracy.
  - Summary: total wall-clock batch time, p50/max request latency, total input tokens, cached tokens, estimated cost for the batch, and cost per 1K messages.
- **Compare toggle** (shadcn `Switch`, "Compare with Responses API"). When it's on, the same batch also runs through `POST /v1/responses` with `gpt-6-luna`, the same concurrency, and one request per message:
  - Structured output schema: `{ urgent: boolean, route: "billing"|"bug"|"sales"|"spam", priority: 1..5 }` (strict). The prompt carries the same instructions and descriptions as the questions.
  - `reasoning.effort` comes from `COMPARE_REASONING_EFFORT`, default `none`, which is the fastest and fairest baseline. The UI shows the effort used.
  - A side-by-side panel shows per-message latency bars, total batch time, the speedup ratio (Responses ÷ Decisions), tokens (input + output and reasoning for Responses; input for Decisions), estimated cost for each, and per-message agreement between the two.
  - The Responses API has no probabilities, so the UI says so instead of faking them.
- **Pricing** constants live in `src/lib/pricing.ts` with source URLs:
  - Decisions: input $0.10/M, cached $0.01/M, cache write $0.125/M, output $0.
  - Responses `gpt-6-luna`: input $0.10/M, cached $0.01/M, output $0.50/M (reasoning tokens are billed as output).
  - Every figure is labelled "estimated".
- **Mock mode** (automatic when `OPENAI_API_KEY` is missing, and selectable from the header when a key is present):
  - The header shows an amber **Mock: illustrative data** badge, and a banner says no API calls are made.
  - `fixtures/mock-decisions.ts` and `fixtures/mock-responses.ts` hold hand-written responses in the exact documented response shapes (`answers` with `probabilities`/`confidence`, `usage`; Responses `output_text` JSON + `usage`). Each carries `synthetic: true` and a hand-picked `latencyMs`.
  - Mock latencies and token counts are **illustrative, not measured**. Keep the Decisions/Responses ratio modest and varied (about 3–8x), not a flat 10x. Label it "illustrative timings" wherever times appear.
  - The server replays each mock after its `latencyMs` (scaled down, keeping proportions) so the parallel fill-in and the speed gap are visible.
  - One mock includes a `refusal` answer so the UI path is exercised.
  - Mock data must never be shown under a **Live** badge.
- **Live mode.**
  - The server reads `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`, `COMPARE_REASONING_EFFORT`, `DECISIONS_MODEL` (default `gpt-6-luna`)).
  - The key stays on the server. It is never returned, logged, or bundled. `GET /api/mode` returns only `{ mode: "mock" | "live" }`.
- **Run:** `cd apps/decisions-triage && bun install && bun run dev`.
- **Deploy:** Vercel project rooted at `apps/decisions-triage`, with Node functions in `api/` (see Vercel).

Out (explicitly):
- auth, persistence, a real mailbox or helpdesk connection, history, and multi-user
- editing questions or choices in the UI (they're fixed in `questions.ts`)
- image or JSON inputs, conversation-history inputs, GPT-Live triggers, and prompt-cache tuning beyond reporting `cached_tokens`
- the async Batch API (it doesn't support `/v1/decisions`)
- Azure OpenAI

## API contract (app-internal)
- `GET /api/mode` returns `{ mode: "mock" | "live" }`.
- `GET /api/fixtures` returns `[{ id, channel, from, subject, body, receivedAt, expected }]`.
- `POST /api/triage` takes `{ messageIds: string[] | "all", strategy: "per_message" | "packed", compare: boolean, forceMock?: boolean, urgentThreshold?: number }` and returns:
  - `decisions: { rows: [{ id, answers: NormalizedAnswers, latencyMs, usage }], batchMs, usage, costUsd, synthetic? }`
  - `responses?: { rows: [{ id, answers: NormalizedAnswers, latencyMs, usage }], batchMs, usage, costUsd, reasoningEffort, synthetic? }`
  - `errors?: [{ id?, source: "decisions" | "responses", status?, message }]`
- `NormalizedAnswers = { urgent: { probability|null, value: boolean|null, refused }, route: { choice|null, confidence|null, probabilities|null, refused }, priority: { score|null (1–5), level|null, confidence|null, probabilities|null, refused } }`. Responses API answers map into the same shape with `probability`, `confidence`, and `probabilities` set to `null`.
- One message failing doesn't fail the batch. It shows up as an error row.
- Validate with zod: known ids, at most 133 messages when packed, at most 50 when per message, and a body size cap.
- Streaming rows to the UI is deferred. The MVP returns the batch in one response, and the client animates rows by `latencyMs`. If that feels flat, switch `/api/triage` to NDJSON later.

## Adapter (the single point of truth for API shapes)
`server/decisions.ts` exports:
- `buildDecisionRequest(message | messages[], questions, strategy)`, which returns the exact request body.
- `callDecisions(client, body)`, which returns `{ raw, latencyMs }`. It uses the SDK `client.decisions.create`, and measures `performance.now()` around the call.
- `normalizeDecision(raw, strategy)`, which maps answers to `NormalizedAnswers` by `name`. It never maps by index alone. It tolerates `refusal`, missing `confidence`, and unknown answer types (shown as "unrecognised").

If the SDK version that bun resolves lacks `client.decisions`, `callDecisions` falls back to `client.post("/decisions", { body })`. That is the SDK's generic request method. Check that it exists in the installed version before relying on it, and fall back to plain `fetch` otherwise. Every field name used here is listed at the top of this plan. Any new field needs a source link in a code comment. `server/responses.ts` mirrors this for the comparison: build, call, and normalise.

## Tasks (vertical slices, in order)
1. **Scaffold + guardrail.**
   - Create `apps/decisions-triage/bunfig.toml` FIRST:
     ```toml
     [install]
     minimumReleaseAge = 259200
     ```
   - Run `bunx create-vite@latest . --template react-ts` without installing, then `bun install`.
   - Add Tailwind v4 and run `bunx shadcn@latest init` with the minimalist (neutral) preset.
   - `bun add openai zod`. Check `bun pm ls` resolves `openai` ≥ 7.30.1 (expect 7.39.x under the 3-day rule) and that `client.decisions` exists.
   - Done when `bun run dev` shows a blank page.
2. **Bun API + mock mode end to end.**
   - `server/index.ts` runs `Bun.serve` routes for `/api/mode`, `/api/fixtures`, and `/api/triage`. Vite `server.proxy` forwards `/api`.
   - `bun run dev` runs both, using `bun run --parallel dev:web dev:api` like Clairic.
   - "Run triage" fills the table from mocks, with the Mock badge showing.
3. **Inbox table + answer rendering.**
   - Urgent badge and threshold slider, route chip with probability popover, priority meter, and Refused badge. Add a row `Sheet` with the body and raw JSON, plus the agreement column.
   - Add shadcn components on demand: `table`, `badge`, `button`, `switch`, `select`, `slider`, `popover`, `sheet`, `progress`, `card`, `tooltip`, `sonner`.
4. **Batch metrics.** Summary strip: batch ms, p50/max, tokens, cached tokens, cost per batch and per 1K messages. Pure functions go in `src/lib/metrics.ts` and `src/lib/pricing.ts`.
5. **Live Decisions.** `server/decisions.ts` (adapter above) plus a concurrency-limited runner (`server/runner.ts`, a tiny hand-rolled pool or `p-limit` if it clears the release-age rule), the packed strategy with its 400-question guard, and per-row errors.
6. **Compare with the Responses API.** `server/responses.ts` builds the strict JSON schema from `questions.ts` (zod → `z.toJSONSchema`). Add the side-by-side panel with latency bars, speedup, tokens, cost, and agreement.
7. **Vercel.**
   - `api/mode.ts`, `api/fixtures.ts`, and `api/triage.ts` export `GET`/`POST` returning Web `Response`s by calling the same `server/http.ts` handlers as Bun.
   - Fixtures and mocks are static TS imports, never disk reads at runtime.
   - Add `vercel.json` and `engines.node: "22.x"` (see Vercel).
8. **Polish + docs.**
   - Empty state, error toasts (401 means a bad key, 429 means rate limited), and an "OpenAI claims up to 10x; these are your measured numbers" note.
   - App `README.md` covering what it is, run commands, env vars, mock vs live, pricing sources, the verified and unverified API notes, and Vercel settings.
   - Append one row to the root README **Demos** table.
9. **Validate + PR.** Record the artifacts in mock mode, commit `media/demo.mp4`, and open exactly ONE PR (see Validation).

## Structure
```
apps/decisions-triage/
  bunfig.toml  package.json  vite.config.ts  vercel.json  index.html  README.md  PLAN.md
  api/
    mode.ts  fixtures.ts  triage.ts   # Vercel Node functions → server/http.ts
  server/
    index.ts        # Bun.serve routes (local dev)
    http.ts         # shared Request → Response handlers (Bun + Vercel)
    env.ts          # reads OPENAI_API_KEY etc.; mode detection
    questions.ts    # urgent / route / priority definitions (single source)
    decisions.ts    # adapter: build, call, normalise /v1/decisions
    responses.ts    # adapter: build, call, normalise /v1/responses comparison
    runner.ts       # concurrency pool, per-row timing, batch timing
    mock.ts         # replay synthetic responses with proportional delay
    schema.ts       # zod request/response + NormalizedAnswers
  fixtures/
    messages.ts         # 10 inbox messages + expected labels
    mock-decisions.ts   # hand-written, documented shape, synthetic: true
    mock-responses.ts   # hand-written, documented shape, synthetic: true
  src/
    App.tsx  main.tsx
    inbox/          # InboxTable, AnswerCells, MessageSheet
    run/            # RunBar, SummaryStrip, ComparePanel
    lib/            # api.ts, pricing.ts, metrics.ts, types.ts
    components/ui/* # shadcn (generated)
  media/demo.mp4    # committed validation video
```

## Stack (one line each)
- **Bun**: the repo-standard runtime. `Bun.serve` routes keep the key server-side for local dev.
- **Vite + React 19 + TS** (`bunx create-vite --template react-ts`): a one-screen console, same as Clairic. Next.js would add weight with no payoff.
- **shadcn/ui (minimalist) + Tailwind v4**: repo standard. Table, Badge, Popover, Sheet, and Switch cover the whole UI.
- **`openai` SDK**: has a typed `decisions.create` and `responses.create`. Fewer hand-typed shapes is better for an API this new. It sits behind the adapter so it can be swapped for `fetch`.
- **zod**: validates requests and generates the strict Responses JSON schema from `questions.ts`.
- **Vercel Node functions (`api/*.ts`)**: same pattern as Clairic PR #3. Thin wrappers over `server/http.ts`.

## Vercel
Root directory `apps/decisions-triage`, production branch `main`. `vercel.json`:
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
- Mock mode needs no env vars. Live mode needs `OPENAI_API_KEY` set as a Vercel env var.
- Use `tsconfig.server.json` (as in Clairic) to type-check `api/`, `server/`, `fixtures/`, and the shared `src/lib` files under `bun run build`.
- A batch with compare on is about 20 upstream calls at concurrency 8, which should finish well within the default function timeout. Note the measured time in the PR.

## Testing / hooks
- `bun test`, for critical logic only:
  1. `normalizeDecision` maps by `name`. It handles all four answer types, including `refusal` and an unknown type. It converts score indices 0–4 to priority 1–5, and it un-namespaces packed names (`m3.route` maps to row `m3`).
  2. `buildDecisionRequest`: the per-message body has exactly 3 questions with the documented fields. The packed body has 3×N questions with unique names and throws above 400.
  3. Every mock fixture passes a zod schema of the **documented** response shape: choice `probabilities` values ⊆ the supplied choices and sum ≈ 1; score `score` ≈ Σ index×probability; predicate `probability` ∈ [0,1]. This catches bad hand-written mocks.
  4. `pricing.ts`: Decisions output tokens cost $0. Cached tokens are billed at the cached rate and not double-counted (they are included in `input_tokens`). Responses output and reasoning tokens are billed at $0.50/M.
  5. `metrics.ts`: batch time, p50, and the speedup ratio.
  6. Handlers: with no `OPENAI_API_KEY`, `/api/triage` returns `synthetic: true` and never constructs an OpenAI client. `/api/mode` never includes the key.
- Git hooks: none (demo app).

## Acceptance criteria
- [ ] With **no env vars**, `bun install && bun run dev` starts, the header shows **Mock: illustrative data**, and "Run triage" fills all 10 rows with no network calls to OpenAI.
- [ ] Each row shows the urgent probability and badge (the threshold slider re-flags rows live), the route with confidence and per-option probabilities, the priority 1–5 with its fractional score and per-level probabilities, the latency in ms, and agreement with expected labels. At least one mock row shows a **Refused** badge.
- [ ] The summary strip shows total batch time, p50/max latency, tokens, cached tokens, and estimated cost per batch and per 1K messages, all labelled "estimated", with pricing sources linked.
- [ ] The **Compare with Responses API** toggle adds per-message latency bars, total time, the speedup ratio, tokens (including reasoning), estimated cost, reasoning effort used, and Decisions/Responses agreement. Mock timings are labelled "illustrative".
- [ ] The **Packed** strategy sends one request with 30 questions (in mock mode, a matching packed mock) and refuses more than 400 questions with a readable error.
- [ ] With `OPENAI_API_KEY` set, the header shows **Live** and calls go to `/v1/decisions` and `/v1/responses` from the server. The key never appears in responses, logs, or `dist/` (`rg` the build output).
- [ ] A 401/429/5xx on one message shows an error row and a toast, and the rest of the batch still renders.
- [ ] `bun test` and `bun run build` pass. The `api/*` handlers load under Node 22 and return mock mode with no env.
- [ ] The diff touches only `apps/decisions-triage/**` plus one added row in the root `README.md` Demos table.

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running app, both in **mock mode** unless a real key is available, in which case add live captures too:
  - Screenshot: the full inbox after a run, with urgent badges, route and priority columns, the summary strip, and the compare panel open.
  - Video, committed at **`apps/decisions-triage/media/demo.mp4`** and attached or linked in the PR: run triage (rows fill in), open a route popover, drag the urgent threshold, open a message sheet, flip **Compare with Responses API**, then switch to **Packed** and run again.
- Note in the PR body which captures are mock (illustrative) versus live (measured).
- Exactly one PR. Only `apps/decisions-triage/**` plus one README Demos row changed.

## Deferred (and why)
- **Editable questions or choices in the UI.** It's a schema-builder UI. Fixed questions keep the comparison honest.
- **Streaming rows (NDJSON or SSE).** Client-side reveal by `latencyMs` is enough for the MVP.
- **Prompt-cache experiments** (a shared policy doc in `input` with `prompt_cache_key`). Interesting for cost, but it needs at least 1,024 prefix tokens and a second run. Report `cached_tokens` only for now.
- **Image, JSON, or conversation inputs, and GPT-Live triggers.** They're off the inbox-triage path.
- **Real inbox connectors** (Gmail, Zendesk). They need auth and persistence.
- **Threshold calibration from labelled data.** The guide recommends it, but 10 fixtures aren't enough data.
