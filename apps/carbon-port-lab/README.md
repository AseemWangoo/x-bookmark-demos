# Carbon Port Lab

Paste a small legacy snippet, pick Low / Medium / High thinking, and port it to a self-contained HTML canvas app. The source and the running canvas sit side by side. Each run shows latency, tokens, and USD at Gemini 4 Carbon's intro rates.

Source bookmark: [Gemini 4 Carbon](https://x.com/i/trending/2120289483031556475). The model is called through Vercel AI Gateway as `google/gemini-4-carbon`.

## Run

```bash
cd apps/carbon-port-lab
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No key is required. Without `AI_GATEWAY_API_KEY` the desk stays in **mock mode**. The banner reads **Mock mode — recorded outputs, no Gemini / AI Gateway calls**. A finished mock port is badged **Recorded output**. The HTML, latency, tokens, and cost are fixtures in `shared/fixtures/`. They are not Gemini samples.

`bun test` and `bun run build` cover intro-rate math, reasoning tokens not being billed twice, HTML fence stripping, the three recorded fixtures, and the live request shape.

## What a port does

The instructions ask for one self-contained HTML document with an inline canvas. The preview uses `<iframe sandbox="allow-scripts" srcdoc="…">`. `allow-same-origin` is not set. The iframe is filled only after a complete document exists. A partial stream is not painted.

The effort toggle is Low / Medium / High, default Medium. It maps 1:1 to `providerOptions.google.thinkingConfig.thinkingLevel`. Switching effort shows the last successful run for that snippet and level, if this tab still has it. **Port** always calls again.

Recorded fixtures:

- Paddle loop, a 2009-style JS game loop
- Compound interest, a small Python utility
- Tip split, a small JS utility

Each fixture has a distinct low, medium, and high HTML port. A paste that does not match a fixture gets a deterministic mock template, still badged as recorded and labelled as an estimate. It is not described as Carbon output.

## Cost

On-screen math uses the intro rates through 30 Nov 2026:

- input $2.00 / 1M
- cached input $0.10 / 1M
- output $10.00 / 1M, which already includes thinking tokens

Fresh input is total input minus cached input. `outputTokenDetails.reasoningTokens` is shown as a breakdown and is not added on top of `outputTokens`. From 1 Dec 2026 the rates are $4 / $0.20 / $20 per 1M. That is a footnote, not the live math. Missing `inputTokens` or `outputTokens` falls back to a labelled estimate of about 4 characters per token. Missing `cacheReadTokens` prices the whole input as fresh and says so.

## Live mode

Set `AI_GATEWAY_API_KEY` in the server process and restart `bun run dev`. The key is not sent to the browser. Optional `AI_GATEWAY_MODEL` overrides the default `google/gemini-4-carbon`.

```bash
AI_GATEWAY_API_KEY=... bun run dev
```

The adapter calls `generateText` from `ai@7.0.165` with:

- `model: 'google/gemini-4-carbon'`
- `instructions` (not `system`)
- `maxOutputTokens: 65536`
- a 15 minute total timeout
- `providerOptions.google.thinkingConfig.thinkingLevel` of `low`, `medium`, or `high`
- `includeThoughts: true`

It does not send `temperature`, `topP`, `topK`, `thinkingBudget`, or the top-level AI SDK `reasoning` option. If the Google provider rejects or warns on `thinkingConfig`, the adapter retries the same object under `providerOptions.vertex`, then stops and reports both attempts. It does not fall back to the shared effort mapping.

`streamText` is exported by the same package and is intentionally not used, so a token stream cannot be written into the iframe early.

## Implementation notes

Live mode was **not** run. This environment had no `AI_GATEWAY_API_KEY`.

Open questions, left inside `server/adapter/gateway.ts`:

1. Whether AI Gateway forwards `providerOptions.google.thinkingConfig.thinkingLevel` for `google/gemini-4-carbon` is untested. The vertex retry exists for a rejection or a warning that mentions thinking. A successful call is not proof the level was honoured.
2. Usage is read as `inputTokens` / `outputTokens` (or `.total` when the count is an object), `inputTokenDetails.cacheReadTokens`, and `outputTokenDetails.reasoningTokens`. Short prompts often will not populate the cache field. The UI says when a field was missing.
3. Whether a personal gateway key can invoke this paid-tier model is untested. Mock mode is the default.
4. `ai@7.0.165` imports and runs its text helpers on this Bun. The package declares `node >= 22`. Do not drop `bunfig.toml`'s `minimumReleaseAge` if a newer `ai` release is inside the three-day gate.

Third-party benchmark figures are not shown in the UI.
