# Astra Assembly Guide

A one-screen desk inspired by OpenAI's GPT-6.2 Astra RC-buggy demo. Paste a parts list or build steps, or attach a photo, and the server asks for strict JSON: parts, assembly steps, and an explode layout. A three.js canvas plays that layout with primitive meshes. Astra and Sol run side by side with a Standard / Fast / Ultrafast pick.

This is a browser approximation. The meshes are boxes, cylinders, spheres, and cones. They are not OpenAI's CAD or Blender assets. Recorded fixtures are hand-authored and labelled that way.

Source: [Introducing GPT-6.2 Astra and Sol](https://openai.com/index/introducing-gpt-6-2-astra-sol/) and [@OpenAI](https://x.com/OpenAI/status/2122750124543926515).

## Run

```bash
cd apps/astra-assembly-guide
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No key is required. Without `OPENAI_API_KEY` the desk stays in **mock mode**. The badge reads **Mock mode — recorded outputs, no OpenAI calls**. Each pane is badged **Recorded fixture**. The parts, steps, positions, latency, and token counts come from `shared/fixtures/`. They were not produced by `gpt-6.2-astra` or `gpt-6.2-sol`.

`bun test` and `bun run build` pass with no key.

## What a run does

Load **RC buggy** or **Desk lamp**, pick a tier (default **Standard**), and run both models. Each pane shows:

- requested tier and the `service_tier` string (`default`, `fast`, or `ultrafast`)
- latency, input, cached input, 30-minute and 12-hour cache writes, output, and reasoning tokens
- USD at short-context rates

Reasoning tokens are shown as a subset of output. They are not added on top. Ultrafast uses the 3× promotional table through 28 Feb 2027 (Pacific). The 6× list rates from 1 Mar 2027 are a footnote, not the live total, while that window is open. Fast is 2× Standard. The UI does not offer `priority`; if a live response returns that legacy alias, the pane says so.

The explode slider, play control, and catalog row highlight the same mesh. Drag the canvas to orbit.

An uploaded photo is resized in the browser to a 2048 px long side and sent as a PNG, JPEG, or WebP data URL. In mock mode the preview stays and the desk refuses with **Live mode needed to read your own photo. Set OPENAI_API_KEY.** It does not invent an assembly. An unknown parts list is also refused in mock mode. Only the two fixtures replay.

## Live mode

```bash
OPENAI_API_KEY=… bun run dev
```

The key is read by the Bun process only. `GET /api/mode` returns the model ids and the banner. It does not return the key.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | unset | Turns on live Responses calls |
| `OPENAI_MODEL_ASTRA` | `gpt-6.2-astra` | Astra model id |
| `OPENAI_MODEL_SOL` | `gpt-6.2-sol` | Sol model id |
| `MOCK=1` | unset | Force recorded fixtures even when a key is set |
| `PORT` | `8787` | Bun API port |

Live calls use `openai@7.57.0` `responses.parse` with `zodTextFormat` (strict `json_schema`). The stable instructions are the first `input` item, role `developer`. `reasoning.effort` is `low` (`none` is rejected by the API; official guidance for a new integration starts at `medium`; this desk does not add an effort toggle). `temperature` and `top_p` are omitted. `service_tier` is sent as `default`, `fast`, or `ultrafast`. Photos are `input_image` data URLs with `detail: "auto"`. `max_output_tokens` is capped at 8000.

The JSON schema uses length-3 number arrays for positions, size, and rotation. Strict structured outputs in this SDK reject tuple-form `items`. Rotation is included so a cylinder can lie on its side. The suggested plan schema did not list it.

## Implementation notes

Live mode was **not** run. This environment had no `OPENAI_API_KEY`, so the working access to `gpt-6.2-astra` / `gpt-6.2-sol`, the returned `service_tier`, and the live `usage` object are unverified.

What the pinned SDK (`openai@7.57.0`, published 2026-11-13) does show in its types:

- `service_tier` already includes `"default"`, `"fast"`, and `"ultrafast"`. No assertion was required.
- `ResponsesModel` is `(string & {}) | ChatModel | …`, so `gpt-6.2-astra` and `gpt-6.2-sol` typecheck as strings. They are not members of the `ChatModel` union in 7.57.0. 7.58.0 and 7.59.0 add the typed ids and are still inside the 3-day install gate, so they are not used.
- Cache-write detail fields on `ResponseUsage` are `ttl_30m_tokens` and `ttl_12h_tokens`. The parser also accepts `"30m"` / `"12h"` if a payload uses those keys. Missing `cache_write_tokens` is treated as zero writes. Missing `usage` becomes a labelled estimate.
- The 7.57 comments still say a Fast request's response shows `service_tier=priority`, and that Ultrafast is currently available for `gpt-5.6-sol`. The launch notes for GPT-6.2 say both Astra and Sol support Fast and Ultrafast, and that a ramped Fast call can return `default`. This desk displays whatever string comes back and does not silently change the requested tier. That conflict is unresolved until a live call.

`bunfig.toml` keeps `minimumReleaseAge = 259200`.
