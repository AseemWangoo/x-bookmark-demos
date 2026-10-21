# Clairic Receipt Extractor: PLAN

Sources: [Cloudflare blog: Introducing Clairic](https://blog.cloudflare.com/clairic-extraction-model/) (2026-10-19) · [model docs](https://developers.cloudflare.com/workers-ai/models/clairic/) · [launch post, @michellechen](https://x.com/michellechen/status/2112241006104244584) · [critique, @jlongster](https://x.com/jlongster/status/2112725692517605868)

## What Clairic is (verified 2026-10-21 from the blog and the model docs)
- Model id: `@cf/cloudflare/clairic`. It's a preview "System One" extraction model on Workers AI. It answers every field in one forward pass and generates no output tokens.
- REST endpoint: `POST https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/cloudflare/clairic` with header `Authorization: Bearer <Workers AI API token>`.
- Request body: `{ "model": "clairic", "state": "<text>", "fields": { "<name>": { "type": "...", "instructions"?: "...", ... } }, "images"?: [...], "reference_date"?: "YYYY-MM-DD" }`.
  - Field types: `text` (span of the input), `number` (`decimals`, `integer`, `unit`), `date`, `time`, `datetime`, `duration` (`unit`), `list` (`items`: text/number/date), plus `estimate` and `forecast`.
  - Limits: `fields` needs at least one entry and has no upper bound (the server splits work into 8,192-token passes). `images` holds at most 4 PNG/JPEG/WebP, base64 only. The context window is 65,536 tokens.
- Response: `{ "model": "clairic", "answers": { "<name>": {...} }, "truncated": bool, "usage": { state_tokens, image_tokens, schema_tokens, input_tokens, output_tokens: 0, passes } }`.
  - Scalar answers: `{ type, value, guess, confidence, p_null }`. `text` answers add `span: [start, end]`.
  - `list` answers: `{ type, value: [...], spans: [[s,e],...], confidence? }`.
  - Null handling: `value: null` when the model thinks the field is absent. `guess` still shows what it would have picked.
  - REST callers may get this wrapped in Cloudflare's usual `{ result, success, errors }` envelope. Unwrap defensively.
- Pricing: $0.10 per million **input** tokens. There is no output-token charge.
- Known weaknesses: Cloudflare says multi-step arithmetic and table aggregation are weak and confidence calibration "can run narrow on unfamiliar data". @jlongster reports it "scored a lot worse than Jev" when extracting payee names from real bank transactions. The demo should show confidence honestly and include one messy real-world fixture where it struggles.

## Goal
Build a one-screen tool. You paste or upload a receipt, invoice, or email and pick preset fields or define your own (name + type). Clairic returns a typed JSON card per field, with a confidence bar, a null flag, and the matching span highlighted in the source. A toggle compares it with a plain LLM structured-output call on latency and estimated cost.

## Single-user MVP
In:
- **Source input.** A textarea, plus upload of a text file (`.txt`, `.eml`, `.md`), plus a fixture picker. Fixtures:
  - a coffee-shop receipt
  - a B2B invoice: the docs' `INV-2291` example, extended with line items
  - the damaged-order support email from the blog
  - a messy bank-transactions snippet. This one is for the payee-name critique and should show low confidence and nulls.
- **Field builder.**
  - Preset field sets per document kind. Examples for a receipt: `merchant` text, `purchased_at` datetime, `subtotal` / `tax` / `tip` / `total` number with 2 decimals in USD, `items` list of text, `card_last4` text. Invoices and emails get their own sets.
  - "Add field" row: name (snake_case, validated), type select (`text`, `number`, `date`, `time`, `datetime`, `duration`, `list`), optional instructions, and type-specific options (`decimals`, `unit`, `integer`, `items`). Fields can be removed.
- **Result cards.** One shadcn `Card` per field, showing:
  - the field name and a type badge
  - the typed value as pretty JSON. Numbers render as numbers and dates as ISO strings.
  - a confidence `Progress` bar with the percentage
  - a **Null** badge when `value === null`, with `guess` greyed out ("model would have guessed …") and `p_null`
  - "computed (no span)" for numbers and dates that have no `span`
- **Span highlighting.**
  - The source panel highlights every `span` and `spans` range with `<mark>`, using one colour per field.
  - Hovering or clicking a card scrolls to and emphasises its span(s). Hovering a mark highlights its card.
  - Overlapping spans render without crashing (nested or striped marks are fine).
- **Compare toggle** (shadcn `Switch`, "Compare with LLM"). When on, the same document and fields also go to a plain LLM structured-output call. A side-by-side panel shows:
  - per-field values from both models, with mismatches flagged
  - end-to-end latency for each, measured on the server
  - tokens: input for Clairic; input + output for the LLM
  - estimated cost per call and per 1M documents. Clairic costs input tokens × $0.10/M. The LLM costs input and output tokens × its listed Workers AI prices.
  - Keep prices in one `pricing.ts` constant with source URLs, and label them "estimated".
- **Sample mode (default, no keys).**
  - Each fixture ships with a recorded Clairic response and a recorded LLM response for its preset field set. Recordings include `usage` and the measured latency in ms.
  - The server replays a recording after its recorded latency, scaled down but proportional, so the speed difference is still visible.
  - Custom fields in sample mode come back as a clearly labelled "not recorded: switch to live mode" placeholder card. Never return fabricated values.
  - Any recording that was hand-authored to the documented schema (not captured from the API) must be marked `"synthetic": true`. The UI then shows a small "illustrative" badge.
- **Live mode.**
  - A small Bun server route reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (fallback `CLOUDFLARE_AUTH_TOKEN`) from env and calls the REST endpoint above with `fetch`.
  - The comparison LLM goes through the same account's Workers AI endpoint. It uses `COMPARE_MODEL`, defaulting to a current Workers AI text model that supports JSON-schema output (verify on its model page), with a JSON schema generated from the field list. No extra key is needed.
  - Keys stay on the server: never returned, logged, or bundled. `GET /api/mode` returns only `{ mode: "sample" | "live" }`. The header shows a "Sample" or "Live" badge, and live mode still lets you switch to sample.
- **Run:** `cd apps/clairic-receipt-extractor && bun install && bun run dev`.

Out (explicitly):
- auth, persistence, history, multi-user, batch processing, and deployment
- `estimate` and `forecast` field types, which are a different UI and need evidence-rich inputs
- image, PDF, and OCR upload (see Deferred)
- Clef or Jev decision-model chaining
- any Worker or Wrangler deployment: the REST API from a local Bun server is enough

## API contract (app-internal)
- `GET /api/mode` returns `{ mode }`.
- `GET /api/fixtures` returns `[{ id, kind, title, source, presetFields }]`.
- `POST /api/extract` takes `{ source, fields: FieldSpec[], compare: boolean, fixtureId?, forceSample?: boolean }` and returns:
  - `clairic: { answers, usage, latencyMs, costUsd, synthetic? }`
  - `llm?: { answers, usage, latencyMs, costUsd, synthetic? }`
  - `errors?`
  - LLM output is normalised into the same `{ type, value, confidence: null, span: null }` shape. The LLM has no confidence or spans; the UI says so.
- Validate the request with zod: at least one field, unique names, a source size cap. Map upstream errors to a readable message in the UI.

## Tasks (vertical slices, in order)
1. **Scaffold + guardrail.**
   - Create `apps/clairic-receipt-extractor/bunfig.toml` FIRST:
     ```toml
     [install]
     minimumReleaseAge = 259200
     ```
   - Scaffold Vite React TS into the directory without installing (`bunx create-vite@latest . --template react-ts`, no install), then run `bun install`.
   - Add Tailwind v4 and run `bunx shadcn@latest init` with the minimalist preset (neutral).
   - Done when `bun run dev` shows a blank page.
2. **Bun API server + sample mode end to end.**
   - `server/index.ts` uses `Bun.serve` with `routes` for `/api/mode`, `/api/fixtures`, and `/api/extract`.
   - Vite `server.proxy` forwards `/api` to it.
   - `bun run dev` starts both processes. Use `concurrently`, or Bun's parallel script runner if available.
   - Picking the receipt fixture and pressing **Extract** renders cards from the recorded response.
3. **Cards: confidence, null, typed JSON.** Confidence bar, Null badge with guess and p_null, type badges, "computed" note. Add shadcn components on demand only: `card`, `badge`, `progress`, `button`, `textarea`, `input`, `select`, `switch`, `tabs`, `tooltip`, `sonner`.
4. **Span highlighting.** Build a pure `buildHighlightSegments(source, spans[])` util (handles overlaps and out-of-range spans) and wire hover/click linking in both directions.
5. **Field builder + upload.** Preset sets per fixture kind, add/remove custom fields with type-specific options, text-file upload into the textarea.
6. **Live mode.**
   - `server/clairic.ts` calls the REST endpoint, unwraps `result` if present, and measures latency.
   - `server/llm.ts` makes the structured-output call. `server/pricing.ts` computes cost from `usage`.
   - The mode switches on env presence.
   - If keys are available locally, re-record the fixtures with a `scripts/record.ts` script and drop the `synthetic` flag. Never commit keys.
7. **Compare toggle.** Side-by-side panel: latency bars, tokens, estimated cost per call and per 1M, per-field agreement.
8. **Polish + docs.** Empty state, error toasts, an honest "Preview model: check confidence" note that links the critique. Write the app `README.md` (what it is, run command, env vars, how sample vs live works, pricing source). Append one row to the root README **Demos** table.
9. **Validate + PR.** Run in sample mode, capture the artifacts, and open exactly ONE PR (see Validation).

## Structure
```
apps/clairic-receipt-extractor/
  bunfig.toml  package.json  vite.config.ts  index.html  README.md  PLAN.md
  server/
    index.ts        # Bun.serve routes: /api/mode, /api/fixtures, /api/extract
    clairic.ts      # REST call to @cf/cloudflare/clairic
    llm.ts          # plain LLM structured-output call (Workers AI)
    pricing.ts      # $/M token constants + source URLs, cost estimate
    sample.ts       # replay recorded responses with proportional delay
    schema.ts       # zod: FieldSpec, ExtractRequest, normalised answers
  fixtures/
    receipt-coffee.{txt,clairic.json,llm.json}
    invoice-northwind.{...}  email-damaged-order.{...}  bank-transactions-messy.{...}
  scripts/record.ts # optional: re-record fixtures with real keys
  src/
    App.tsx  main.tsx
    source/         # SourcePanel (textarea/upload/fixture picker), HighlightedText, segments.ts
    fields/         # FieldBuilder, presets.ts
    results/        # FieldCard, ConfidenceBar, ComparePanel
    lib/api.ts
    components/ui/* # shadcn (generated)
```

## Stack (one line each)
- **Bun**: repo-standard runtime and package manager. `Bun.serve` routes give the server a tiny, dependency-free API layer that keeps keys server-side.
- **Vite + React 19 + TS (`bunx create-vite --template react-ts`)**: this is a one-screen utility, so Next.js would add weight with no payoff. It also matches `apps/openui-trip-planner`.
- **shadcn/ui (minimalist preset) + Tailwind v4**: repo standard. Card, Progress, Badge, and Switch cover the whole UI.
- **zod**: one schema validates the request and generates the LLM's JSON schema (`z.toJSONSchema`).
- **Plain `fetch` to the Workers AI REST API**: no SDK needed for two POST calls, and no Wrangler or Worker deployment.
- **concurrently** (only if Bun lacks a parallel script runner): a boring way to run Vite and the Bun API with one `bun run dev`.

## Testing / hooks
- `bun test`, for critical logic only:
  1. Every fixture's recorded `span`/`spans` satisfies `source.slice(s, e) === value` (or the list item). This guards the highlighting and catches bad synthetic recordings.
  2. `buildHighlightSegments` handles overlapping, adjacent, and out-of-range spans.
  3. `pricing.ts` cost math: Clairic charges input tokens only.
  4. The `/api/extract` handler in sample mode never touches `process.env` keys, and `/api/mode` never returns them.
- Git hooks: none (demo app).

## Acceptance criteria
- [ ] With **no env vars**, `bun install && bun run dev` starts, the header shows **Sample**, and each of the 4 fixtures extracts its preset fields with no network calls to Cloudflare.
- [ ] Each result card shows a typed value (a JSON number for number fields, an ISO string for dates), a confidence bar with its %, and a **Null** badge plus greyed guess plus `p_null` when `value` is null. The receipt or email fixture includes at least one null field.
- [ ] Every text/list answer with a span is highlighted at exactly the right characters (enforced by test 1). Hovering a card emphasises its span, and computed fields say "no span".
- [ ] A user can add a custom field (name + type + optional instructions) and remove it. In sample mode an unrecorded custom field shows the "not recorded" placeholder, never invented data.
- [ ] Uploading a `.txt`/`.eml` file loads it into the source panel.
- [ ] The compare toggle shows latency (ms), tokens, and estimated cost per call and per 1M for Clairic vs the LLM, plus per-field agreement. Costs are labelled "estimated" and cite the pricing source.
- [ ] Synthetic recordings show an "illustrative" badge.
- [ ] With `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` set, the header shows **Live**, and extraction calls `@cf/cloudflare/clairic` through the Bun route. Keys never appear in any response body, the client bundle (`rg` the build output), or logs.
- [ ] Upstream errors (bad token, 4xx/5xx) show a readable toast instead of a blank screen.
- [ ] `bun test` passes.
- [ ] The diff touches only `apps/clairic-receipt-extractor/**` plus one added row in the root `README.md` Demos table.

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running app, both recorded in **sample mode** (no keys):
  - Screenshot: the receipt fixture extracted, with cards (confidence bars, one Null card) and highlighted spans in the source; ideally the compare panel visible too.
  - Video: pick a fixture, extract, hover cards to show span highlighting, add a custom field, flip **Compare with LLM** to show latency and cost, then run the messy bank-transactions fixture to show low confidence and nulls.
- Exactly one PR. Only `apps/clairic-receipt-extractor/**` plus one README Demos row changed.

## Deferred (and why)
- **Image, PDF, and receipt-photo upload.** Clairic accepts up to 4 base64 images, but image answers have no text spans to highlight and there's no keyless fixture path. Add it after the text slice works.
- **`estimate` / `forecast` fields.** They need distribution UI and evidence-rich inputs. They're off the receipt-extraction path.
- **Clef/Jev chaining** (extract → decide). It's interesting, especially given the critique that Jev beat Clairic on payee names, but it's a second demo.
- **Batch mode and a CSV export.** Single-document MVP first.
- **Deployment as a Worker with an `env.AI` binding.** It needs Wrangler and an account, so it stays a local demo first.
