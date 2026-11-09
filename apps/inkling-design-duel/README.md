# Inkling Design Duel

One prompt, two pages. Inkling 2 Small is asked for the same UI brief at reasoning effort **0.2 (low)** and **0.9 (high)**. The HTML renders side by side in sandboxed iframes with latency, tokens, and USD cost on each pane.

Source bookmark: [Thinking Machines, Inkling 2 Small on Tinker](https://x.com/thinkymachines/status/2118489527362912566).

## Run

```bash
cd apps/inkling-design-duel
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No key is required. Without `TINKER_API_KEY` the desk stays in **mock mode**. The banner reads **Mock mode — recorded outputs, no Tinker calls**. Each finished pane is badged **Recorded output**. The HTML, latency, tokens, and cost are fixtures in `shared/fixtures/`. They are not Inkling samples.

`bun test` and `bun run build` cover the cost math, HTML unfencing, the mock duel, and the live request shape.

## What a duel does

The system prompt asks for one self-contained HTML document. Generate fires both efforts in parallel. Each pane shows pending, then the page, then:

- latency in milliseconds
- prompt and completion tokens
- cost at **$0.30 / 1M** input, **$0.03 / 1M** cached input, **$1.00 / 1M** output

Previews use `<iframe sandbox="allow-scripts">`. `allow-same-origin` is not set. An optional PNG or JPEG sketch is read as a data URI. Remote image URLs are rejected.

## Live mode

Set `TINKER_API_KEY` in the server process and restart `bun run dev`. The key is not sent to the browser.

Optional:

- `TINKER_MODEL` — tried first, then `thinkingmachines/Inkling-2-Small`, then `thinkingmachines/Inkling-2-Small:peft:262144:sampling-nvfp4`
- `TINKER_BASE_URL` — replaces the OpenAI-compatible base only

The adapter calls `POST /chat/completions` on `https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1` with `reasoning_effort` `0.2` or `0.9` and `separate_reasoning: true`. If every model id fails, it retries the same ids on the Anthropic-compatible Messages API (`output_config.effort` `"low"` or `"high"`). Sketch parts are `image_url` data URIs on the OpenAI path and base64 image blocks on the Anthropic path. Missing `usage` is labelled as an estimate (about 4 characters per token).

Live mode was **not** run here. There was no `TINKER_API_KEY`, so the working model id, OpenAI-compatible vision, and real usage fields are still unverified. See `PLAN.md` implementation notes.
