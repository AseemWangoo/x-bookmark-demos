# Kimi 3D Scene Builder

One screen. You describe a scene, Kimi K3.1 Pro writes three.js, and it renders in a sandboxed iframe next to the code. Edits rewrite the current scene. A Pro / Highspeed switch records latency, tokens, and estimated cost for every turn. If the scene throws, **Fix it** sends that error back once.

Mock mode is the default when `MOONSHOT_API_KEY` is missing. The header badge says **Mock: hand-written examples, no API calls**, and a banner says the code was written by hand. Free-text prompts that are not one of the three examples return an error and no code. Timings in that mode are **illustrative**. They are not a measurement of Moonshot's "about 2–3× faster" claim, and they are not model output.

## Run

```bash
cd apps/kimi-3d-scene-builder
bun install
bun run dev
```

Open `http://127.0.0.1:5173`. `bun run dev` starts Vite and the Bun API together. The API listens on `127.0.0.1:8787`. Vite proxies `/api` to it.

```bash
bun test
bun run build
```

## Mock vs live

`GET /api/mode` returns `{ "mode": "mock" }` or `{ "mode": "live" }`. It never returns the key.

Live mode turns on when `MOONSHOT_API_KEY` is set. Optional:

- `MOONSHOT_BASE_URL` (default `https://api.moonshot.ai/v1`)
- `KIMI_MAX_COMPLETION_TOKENS` (default `32768`)
- `KIMI_DEFAULT_EFFORT` (default `high`; the API default is `max`)
- `MOCK_SLEEP_SCALE` (default `0.35`) shrinks the fake stream delay. The numbers stored on the turn stay the hand-picked illustrative timings.

With a key set, the header shows **Live** and a **Use mock examples** toggle. The browser never sees the key.

`POST /api/turn` streams NDJSON: `start`, `reasoning`, `content`, `done`, `error`.

## Sandbox

The scene runs in an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`, so the frame has an opaque origin and cannot read `parent.document`. The runtime deletes `fetch`, XHR, WebSocket, workers, and storage, and `new Function` compiles the model output as the body of `build(kit)`. Orbit controls are always on. `kit.setSky` paints a canvas gradient. A tight `while(true){}` is supposed to miss heartbeats so the parent destroys the iframe after 4 seconds (or after 8 seconds if it never becomes ready). Chrome usually runs that frame in another process. A tight loop can still freeze the tab when the frame shares the page process. That happened here under `--no-sandbox`. With site isolation on, the watchdog recreated the iframe.

The served `sandbox.html` inlines the runtime as one classic script. A `type=module` script from an opaque origin is a CORS fetch from origin `"null"`, and Chrome blocks it. `script-src` is that script's sha256 plus `'unsafe-eval'` (for `new Function`). The rest of the policy is `default-src 'none'`, `style-src 'unsafe-inline'`, `img-src data: blob:`, and no connect, worker, or frame sources. The source `sandbox.html` documents the `script-src 'self'` policy that works for a classic same-URL script and why the served file does not use it. In Chrome 156 the frame logs `fetch` as `undefined`, `parent.document` throws `SecurityError`, and an `https://example.com` image is refused by `img-src`.

## API notes

Adapter: `server/kimi.ts`. Prices: `src/lib/pricing.ts` (checked 2026-10-26 against the [chat pricing table](https://platform.kimi.ai/docs/pricing/chat)). Pro is $2 / $10 per 1M input / output. Highspeed is $4 / $20. Cached input is $0.20 on both. Cost uses the 5-minute cache-write price. Reasoning tokens sit inside completion and are not billed again.

Checked against the docs, not against a live key (none was available):

- `POST https://api.moonshot.ai/v1/chat/completions` with `kimi-k3.1-pro` and `kimi-k3.1-pro-highspeed`
- `stream: true`, `stream_options.include_usage: true`, `reasoning_effort` of `low` | `high` | `max`
- temperature, top_p, n, penalties, and `thinking` are omitted
- usage is read from `chunk.usage ?? choices[0].usage`, including a final `choices: []` chunk

Unverified, so they stay behind the adapter:

- The China host (`MOONSHOT_BASE_URL`; default stays on `api.moonshot.ai`)
- Real latency and the 2–3× Highspeed claim
- Whether `reasoning_effort: "max"` and `reasoning_content` match the installed `openai` SDK types (the adapter casts)
- Whether `cached_tokens` is always present (missing fields count as 0)
- One-shot code quality under this `kit` contract
- Per-tier rate limits (the server allows 2 upstream calls at once and maps 401, 404, and 429)

## Vercel

Root directory `apps/kimi-3d-scene-builder`. Framework Vite. Install `bun install`, build `bun run build`, output `dist`. Node `22.x` in `package.json` `engines`. `vercel.json` does not set `bunVersion`. `api/turn.ts` sets `maxDuration` to 300 seconds so a max-effort live turn is not cut off at the platform default. That ceiling was not measured against a live call.
