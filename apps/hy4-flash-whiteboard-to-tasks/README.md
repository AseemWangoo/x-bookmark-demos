# Hy4 Flash Whiteboard to Tasks

A one-screen desk that turns a few whiteboard photos plus a pasted doc or chat thread into a task board. Each task and open question links back to the image (filename and an approximate region) or the exact passage it came from. A metrics strip shows TTFT, total latency, tokens, cost, the 1M context, and a **12B active / 224B MoE** badge.

This is a structured extraction desk. It is not a hosted Hy4 flash playground and it is not OpenCode. The sample boards are hand-authored. They were not produced by `hy4-flash`, and they are not Tencent assets.

Sources: [Tencent Hy4 flash launch](https://www.tencent.com/zh-cn/tencent-launches-hy4-flash-to-power-high-speed-cost-efficient-ai-deployment-for-everyday-workflows/), [TokenHub Hy API guide](https://www.tencentcloud.com/document/product/1300/80695), [OpenRouter tencent/hy4-flash](https://openrouter.ai/tencent/hy4-flash), and [@TencentHunyuan](https://x.com/TencentHunyuan/status/2122912575302119554).

The UI badge matches the launch post (12B active / 224B total, including 64B Engram). The model card is more precise: about 220B total including ~64B Engram, with 11.3B text + 0.43B vision active per token, and a 1,048,576 context. This demo does not download the weights.

## Run

```bash
cd apps/hy4-flash-whiteboard-to-tasks
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No key is required. Without a TokenHub or OpenRouter key the desk stays in **Mock / Sample Mode — recorded outputs, no Hy4 flash calls**. Load **Sprint whiteboard + incident thread** or **Architecture review board + RFC**, then **Extract tasks**. Latency, tokens, and cost are canned. Source back-links jump to a real region on the sample board or a real line in the sample thread.

`bun test` and `bun run build` pass with no key.

An uploaded photo or a thread that is not one of those two samples is refused: **Live mode needed to read your own images or text. Set a TokenHub or OpenRouter key.** The preview stays. The desk does not invent a board.

## What a run shows

- Photos in a stage, with a red **Source region** box when an image back-link is selected. Regions are normalized 0–1 and treated as approximate.
- The pasted thread, with the selected line range in a `<mark>` plus a **Source** chip.
- Tasks filterable by owner, due hint, priority, and status, plus an open-questions list.
- TTFT, wall-clock, input / cached / output / reasoning tokens, and cost. Reasoning tokens are a subset of output. They are not added on top of the bill. Fresh input is `prompt - cached`.
- Flash (`no_think`) is the default. Think (`high`) is a toggle. The sample numbers are the recorded Flash pass either way.

TokenHub promo math is 50% off input and output until **2026-11-30 12:00 Beijing** (2026-11-30 04:00 UTC). Cache-hit stays at list, because the official note does not say the promo covers it. After that cutoff the helper uses list rates: **$0.070 / $0.281 / $0.003** per 1M and **¥0.5 / ¥2 / ¥0.02** per 1M. OpenRouter uses the published promo **$0.035 / $0.1405 / $0.0015** per 1M, labeled as having no published end date. A custom endpoint is not metered.

## Live mode

```bash
TOKENHUB_API_KEY=… bun run dev
OPENROUTER_API_KEY=… HY4_FLASH_PROVIDER=openrouter bun run dev
HY4_FLASH_BASE_URL=http://127.0.0.1:8000/v1 HY4_FLASH_PROVIDER=custom bun run dev
```

The key is read by the Bun process only. `GET /api/mode` returns the provider, model id, and whether a key is configured. It does not return the key.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HY4_FLASH_PROVIDER` | TokenHub when that key exists, else OpenRouter, else custom | `tokenhub`, `openrouter`, or `custom` |
| `TOKENHUB_API_KEY` / `HUNYUAN_API_KEY` / `HY4_FLASH_API_KEY` | unset | First present wins for TokenHub |
| `OPENROUTER_API_KEY` | unset | OpenRouter |
| `HY4_FLASH_BASE_URL` | provider default | Required for `custom`. Overrides the selected provider's host when set |
| `HY4_FLASH_MODEL` | `hy4-flash`, or `tencent/hy4-flash` on OpenRouter | Model id |
| `TOKENHUB_REGION` | `intl` | `intl` → `https://tokenhub-intl.tencentcloudmaas.com/v1`. `guangzhou` → `https://tokenhub.tencentmaas.com/v1` |
| `MOCK=1` | unset | Force the recorded fixtures even when a key is set |
| `PORT` | `8787` | Bun API port |

Live calls use `openai@7.57.0` Chat Completions (`POST /v1/chat/completions`). Images are `image_url` data URLs with `detail: "high"`. The request tries strict `response_format.json_schema` first, then `json_object`, then a fenced JSON parse. A response that does not validate is an error. Tasks are not invented to fill the gap. The stream records TTFT on the first content or reasoning token. Hosted sampling is `temperature: 0.2`. The self-hosted adapter uses the model card's `temperature: 0.9`, `top_p: 1`.

Flash sends provider-specific no-think flags, because `no_think` is not in the pinned SDK's `ReasoningEffort` union and is passed through on the JSON body:

- TokenHub: `reasoning_effort: "no_think"` and `thinking: { type: "disabled" }`
- OpenRouter: `reasoning: { enabled: false }` (not TokenHub's field)
- Custom / vLLM: those flags plus `chat_template_kwargs: { reasoning_effort: "no_think" }`

Think sends `high` / `thinking.enabled` / OpenRouter `reasoning: { enabled: true, effort: "high" }`.

OpenCode's `hy4-flash-free` path is not used. The inference docs say that free-tier chat models return 403 outside the OpenCode client.

## Implementation notes

Live mode was **not** run. This environment had no `TOKENHUB_API_KEY`, `HUNYUAN_API_KEY`, `HY4_FLASH_API_KEY`, or `OPENROUTER_API_KEY`.

Still open, and isolated in the adapters:

1. The exact live `usage` shape (cached tokens, reasoning tokens, cache-hit billing) on TokenHub versus OpenRouter. Missing usage becomes a labelled estimate.
2. Whether TokenHub strictly enforces `response_format.json_schema` for `hy4-flash`. The client tries schema, then JSON object, then a fence parse, and records `outputMode`.
3. Whether OpenRouter honors `reasoning.enabled: false` for this model. The OpenRouter body does not send TokenHub's `reasoning_effort` / `thinking` fields.
4. Live bbox quality. The prompt asks for a normalized region plus a short quote. A bad region is dropped and the image or passage link remains.

`bunfig.toml` keeps `minimumReleaseAge = 259200`. `openai` stays at 7.57.0. 7.58.0 and later were still inside the 3-day gate when this was pinned.
