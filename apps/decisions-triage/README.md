# Decisions triage

One screen for the [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions) (`gpt-6-luna`). Load ten fictional support messages and ask three questions of each: is it urgent (predicate), which queue (choice: billing, bug, sales, spam), and what priority (score, P1–P5). The console shows probabilities, per-message latency, batch time, and estimated cost. A switch runs the same batch through the Responses API with strict JSON so you can compare speed and cost.

Mock mode is the default when `OPENAI_API_KEY` is missing. It replays hand-written responses in the documented shape. Those numbers are marked **illustrative**. They are not model output and not a measurement.

## Run

```bash
cd apps/decisions-triage
bun install
bun run dev
```

Open the Vite URL (default `http://127.0.0.1:5173`). `bun run dev` starts Vite and the Bun API together. The API listens on `127.0.0.1:8787`; Vite proxies `/api` to it.

```bash
bun test
bun run build
```

## Mock vs live

`GET /api/mode` returns `{ "mode": "mock" }` or `{ "mode": "live" }`. It never returns the key.

Live mode turns on when `OPENAI_API_KEY` is set in the server environment. Optional:

- `OPENAI_BASE_URL`
- `DECISIONS_MODEL` (default `gpt-6-luna`, the only model the Decisions guide lists)
- `COMPARE_REASONING_EFFORT` (default `none`)

The browser never sees the key. Live triage calls `POST /v1/decisions`. Compare calls `POST /v1/responses` with `text.format.type = "json_schema"`. With a key set you can still force mock mode from the header. Mock data is never shown under the Live badge.

`POST /api/triage` body:

```json
{ "messageIds": "all", "strategy": "per_message", "compare": false }
```

`strategy` is `per_message` (concurrency 8) or `packed` (one request, questions named `<id>.urgent`, `<id>.route`, `<id>.priority`, refused above 400 questions).

## Pricing

Estimates only. Output tokens on `/v1/decisions` are not billed. Cached tokens are a subset of `input_tokens` and are billed at the cached rate, not twice. Responses reasoning tokens are included in `output_tokens` and billed as output.

| Surface | Price | Source |
| --- | --- | --- |
| Decisions input | $0.10 / 1M uncached, $0.01 / 1M cached, $0.125 / 1M cache write, output $0 | [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) |
| Responses `gpt-6-luna` | $0.10 / 1M input, $0.01 / 1M cached, $0.50 / 1M output | [model page](https://developers.openai.com/api/docs/models/gpt-6-luna) |

Constants live in `src/lib/pricing.ts`.

## What was checked, and what was not

Checked against the Decisions guide, the TypeScript reference, and `openai@7.39.0` (the newest release that clears this repo’s 3-day install age):

- `client.decisions.create`, predicate / choice / score questions, refusal answers, and `usage`
- Response answers carry `type` plus `name`. Refusal is `{ type: "refusal", name }` with no probability payload
- Score is a probability-weighted average of level indices 0–4. This UI shows that value plus one
- The async Batch API does not accept `/v1/decisions`. A “batch” here is N parallel calls, or one packed call

Not verified, because there is no API key in this environment:

- Per-question latency. The response has no timing field. The number on a row is the wall-clock time of that message’s request (all 3 questions). Packed rows share the one request’s time
- Whether `/v1/decisions` sends a processing-time header. One is logged if present and never required
- Decisions-specific rate limits. Concurrency is capped at 8 and 429s are surfaced
- The exact HTTP error body. The adapter reads `APIError.status` and `message`
- A formula for `confidence`. It is displayed as reported
- The installed SDK comment still says 1–200 questions. The guide says 1–400, and the packed guard uses 400. `input_json` and non-user message roles were typed after 7.39.0; this demo sends a string `input`

OpenAI’s “up to 10× faster than the Responses API” claim is shown as their claim. The ratio in the compare panel is this run’s own number. In mock mode that number is illustrative, varied about 3–8×, and labeled as such.

## Vercel

Create the project from this GitHub repo and set the root directory to `apps/decisions-triage`. Production deploys from `main`. `vercel.json` pins the build:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install command | `bun install` |
| Build command | `bun run build` |
| Output directory | `dist` |
| Node.js version | 22.x (`engines.node`) |

Leave the function runtime on Node.js. Do not set `bunVersion`. `/api/mode`, `/api/fixtures`, and `/api/triage` are the files in `api/`. Mock mode needs no environment variables. Live mode uses `OPENAI_API_KEY` on the server.

Fixtures and mocks are imported into those functions. They are not read from disk at runtime. A compare run is up to 20 upstream calls at concurrency 8.
