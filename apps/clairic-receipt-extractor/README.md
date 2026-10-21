# Clairic receipt extractor

One screen for [Clairic](https://developers.cloudflare.com/workers-ai/models/clairic/) (`@cf/cloudflare/clairic`). Paste a receipt, invoice, or email, pick typed fields, and get a JSON value, a confidence bar, and the source span highlighted. A compare switch runs the same fields through a Workers AI model with JSON-schema output so you can see latency, tokens, and estimated cost side by side.

Sample mode is the default. It replays hand-written recordings in Clairic's documented response shape. Those recordings are marked **illustrative**. No Cloudflare key is required.

## Run

```bash
cd apps/clairic-receipt-extractor
bun install
bun run dev
```

Open the Vite URL (default `http://127.0.0.1:5173`). `bun run dev` starts Vite and the Bun API together. The API listens on `127.0.0.1:8787`; Vite proxies `/api` to it.

```bash
bun test
bun run build
```

## Sample vs live

`GET /api/mode` returns `{ "mode": "sample" }` or `{ "mode": "live" }`. It never returns credentials.

Live mode turns on when both of these are set in the server environment:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` (fallback: `CLOUDFLARE_AUTH_TOKEN`)

The browser never sees them. Live extraction calls:

`POST https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run/@cf/cloudflare/clairic`

The compare model is `COMPARE_MODEL`, default `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, on the same account. It uses Workers AI JSON mode (`response_format.type = json_schema`).

With keys present you can still force sample mode from the header. To replace the illustrative fixtures with live responses:

```bash
bun run record
```

That script writes `fixtures/*.clairic.json` and `fixtures/*.llm.json` and drops `synthetic`. Do not commit the env file.

## Pricing

Estimates only.

| Model | Price | Source |
| --- | --- | --- |
| `@cf/cloudflare/clairic` | $0.10 / million input tokens. Output tokens are 0 and are not billed. | [model page](https://developers.cloudflare.com/workers-ai/models/clairic/) |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | $0.293 / million input, $2.253 / million output | [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) |

Constants live in `src/lib/pricing.ts` and are re-exported from `server/pricing.ts`.

## Fixtures

- Coffee receipt, including a null loyalty id
- Northwind invoice `INV-2291` from the model docs, extended with line items
- Damaged-order email from the [launch post](https://blog.cloudflare.com/clairic-extraction-model/)
- Messy bank descriptors. Payee extraction is the weak spot called out in [this critique](https://x.com/jlongster/status/2112725692517605868)

A field that was not recorded comes back as `not recorded: switch to live mode`. Sample mode does not invent values.
