# OCRia Table Lens: PLAN

Sources (read 2026-11-25):

- [Hugging Face: llamaindex/OCRia-1](https://huggingface.co/llamaindex/OCRia-1) (BF16 weights, Quickstart, output format, license summary, `prompt.txt`)
- [prompt.txt](https://huggingface.co/llamaindex/OCRia-1/raw/main/prompt.txt) (the trained system prompt)
- [LICENSE](https://huggingface.co/llamaindex/OCRia-1/blob/main/LICENSE) (OCRia-1 Model and Code License, based on AI Pubs Open RAIL-M)
- [Hugging Face: llamaindex/OCRia-1-GGUF](https://huggingface.co/llamaindex/OCRia-1-GGUF) (Q8_0 / BF16 GGUF + vision projector, Ollama and llama.cpp recipes)
- [LlamaIndex blog: Introducing OCRia-1](https://www.llamaindex.ai/blog/parse-ocria-1) (fact box: "Released Oct 22, 2026"; "Available in LlamaParse")
- [Ollama library: llamaindex/ocria-1](https://ollama.com/llamaindex/ocria-1) (official tags, `/api/chat` recipe, memory notes, Ollama 0.40.18+)
- [Ollama Vision](https://docs.ollama.com/capabilities/vision) (native `images` field)
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) (`/v1/chat/completions` vision; base64 image content is supported, remote Image URL is not)
- [LlamaParse Parse overview](https://developers.llamaindex.ai/llamaparse/parse/) and [Tiers — Powered by OCRia-1](https://developers.llamaindex.ai/llamaparse/parse/guides/tiers/)
- [OCRia-1 Technical Report, arXiv:2611.00092](https://arxiv.org/abs/2611.00092) (abs API: first published 2026-10-22T17:34:59Z / 22 Oct 2026, 11:04 PM IST)
- Launch post: [@jerryjliu0](https://x.com/jerryjliu0/status/2125266115874144473) (2026-11-24 16:31:42 UTC / 24 Nov 2026, 10:01 PM IST)
- Ollama post: [@ollama](https://x.com/ollama/status/2125317662612041819) (2026-11-24 19:56:31 UTC / 25 Nov 2026, 1:26 AM IST)
- Context7 was attempted for Ollama / LlamaIndex docs; the monthly quota was exceeded, so this plan uses the official pages above instead
- npm registry publish times for `openai`, `pdfjs-dist`, `react-markdown`, `lucide-react`, and the shared Vite/shadcn set (age gate = 3 days; checked 2026-11-25)

## Goal

A one-screen **table lens**: drop in a scanned page, a screenshot, or a PDF page; **OCRia-1** transcribes it to Markdown (tables as HTML) via a local Ollama server; the desk shows the Markdown beside the original, turns detected tables into a sortable grid with CSV export, and offers a copy-Markdown button. Recorded demo mode is the default so tests, the screenshot, and the video run without the ~5.8 GB model.

This is a local page-to-Markdown desk, not LlamaParse and not LiteParse / OCRia-nano-1. Label recorded vs live honestly. Do not put official ParseBench scores in the UI.

## Verified model facts (OCRia-1)

### Names, size, and lineage

- Official product name: **OCRia-1**. A **4B** vision-language model for document parsing from LlamaIndex, fine-tuned from **Qwen3.5-4B** (Apache-2.0). Confirmed on the [HF card](https://huggingface.co/llamaindex/OCRia-1), the [Ollama card](https://ollama.com/llamaindex/ocria-1), and the [technical report](https://arxiv.org/abs/2611.00092).
- The Hugging Face model page also lists **"Model size 5B params"** / BF16. That figure is not explained on the card (it may include the vision encoder). Do not invent a breakdown. In the UI, call it a **4B** VLM, matching the official product name.
- Open weights: [`llamaindex/OCRia-1`](https://huggingface.co/llamaindex/OCRia-1) (unoptimized BF16). GGUF builds: [`llamaindex/OCRia-1-GGUF`](https://huggingface.co/llamaindex/OCRia-1-GGUF) — `OCRia-1-Q8_0.gguf` (5.2 GB), `OCRia-1-BF16.gguf` (9.7 GB), plus `mmproj-OCRia-1-f16.gguf` (0.7 GB vision encoder, required with either). There is **no official 4-bit build**; the GGUF card says Q4_K_M lost 6.3 points on financial tables and 4.8 on insurance filing tables.
- **Two public dates, both sourced:** the technical report was first published on arXiv on **22 Oct 2026** (17:34:59 UTC / 11:04 PM IST), and the blog fact box says "Released Oct 22, 2026" / "Available in LlamaParse". Jerry Liu's post on **24 Nov 2026** (10:01 PM IST) says "Today we are open-sourcing the weights" on Hugging Face and Ollama, the second open-weight release in two days after OCRia-nano-1. Treat 22 Oct as the report / LlamaParse-era date, and 24 Nov as the open-weight + Ollama date. Do not collapse them into one event.

### License (not Apache-2.0)

- Weights and the `ocria_grounding/` code are under the **OCRia-1 Model and Code License**, based on the AI Pubs Open RAIL-M license. The HF card is explicit: **"the code is not open source."**
- Free for research (academic and non-profit research, teaching, evaluation and benchmarking, and internal R&D that does not reach a product or production workflow); free for personal use; free for commercial use by organizations under **$2M annual revenue** and under **$2M total funding**.
- A commercial license is required above those thresholds, and for any use in a document parsing, OCR, or extraction product or service that competes with LlamaParse or LlamaCloud, whatever the size.
- You own your outputs. Attachment B notes the Qwen3.5-4B Apache-2.0 base. The README must summarize these terms and link the license; this demo is a personal research / evaluation desk, not a competing parser.

### Official Ollama tag (this demo's live path)

- Library model: **`llamaindex/ocria-1`**. Requires **Ollama 0.40.18 or later**.
- Tags (from the Ollama card):

  | Tag | Size on the card | Notes |
  | --- | --- | --- |
  | `latest`, `q8_0` | **5.8 GB** | 8-bit weights. Default. Linux, Windows, macOS. |
  | `bf16` | **10.4 GB** (tag list also shows "10GB") | Original BF16 weights. |
  | `bf16-mlx` | **10.4 GB** | MLX build, Apple Silicon only. Tested with Ollama 0.40.16 on an M4 Max (36 GB). |

- Default for this demo: **`llamaindex/ocria-1`** (latest = `q8_0`). Ollama's launch post demonstrated `ollama pull llamaindex/ocria-1:bf16`; that is the larger tag, not the default. The GGUF card also allows `ollama run hf.co/llamaindex/OCRia-1-GGUF:Q8_0`.
- CLI: `ollama run llamaindex/ocria-1 --think=false ./page.png`.

### How to send a page image

Official Ollama card (primary, use this in the live adapter):

- `POST http://localhost:11434/api/chat`
- One page per request. User **content is an empty string**. The page is in the message **`images`** array as base64 (no `data:` prefix in the official snippet).
- **`"think": false`** is required. With thinking on, the model answers in the wrong format. The Qwen3.5 chat template turns thinking on by default.
- Do **not** invent a custom system prompt. The Ollama model already ships with `prompt.txt` as its system prompt. If a system message is set, it must be `prompt.txt` copied as-is.
- Defaults on the card: **temperature 0**, **32,768** context, up to **24,576** output tokens. A dense page can need all of it; if `done_reason` is `length`, surface a warning (the card says raise `num_ctx` and `num_predict`). The library tag table also lists **256K** context for the tags; that is the listed model context, not the recommended serving context. Serve at 32,768 unless a live run proves a higher `num_ctx` is needed.
- `keep_alive: "5m"` is in the official example (use `"0"` to unload after each request).
- The answer can come wrapped in a ` ```markdown ` fence; **strip it**.
- Render PDF pages to images first, at **300 DPI**. Official example: `page.get_pixmap(dpi=300)` with PyMuPDF. The vision encoder allows images up to 16.7 million pixels (~16k image tokens). Lower resolution costs accuracy on small print.
- A 300 DPI page adds up to **~8k image tokens**.

OpenAI-compatible path (verified as a general Ollama feature; secondary):

- `POST http://localhost:11434/v1/chat/completions` with the `openai` SDK (`baseURL` `http://localhost:11434/v1/`, `apiKey` ignored).
- Vision parts use `{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }` (or the flatter `image_url: "data:..." ` form in Ollama's own example). **Remote Image URLs are documented as not supported**; send a data URI or use the native `images` field.
- Pass **`think: false`** (Ollama extension on `/v1`). For vLLM / llama.cpp OpenAI servers, the HF Quickstart instead sends `prompt.txt` as the system message, no user text, `temperature=0`, `max_tokens=24576`, and `extra_body={"chat_template_kwargs": {"enable_thinking": False}}`.
- Equivalence of the `/v1` path vs native `/api/chat` for this exact model is **unverified in this plan**. Prefer the native recipe until a live run confirms `/v1`.

### Output format

From the HF card and `prompt.txt`: transcribe the page as Markdown, as accurately as possible — do not describe or summarize. **Tables (and chart data) are HTML tables**, including `colspan` / `rowspan` for merged cells. Charts become HTML tables of their data points, not a picture description. Diagrams / flowcharts may be Mermaid. Formulas are LaTeX with `$...$` / `$$...$$`. Page furniture uses `<page_header>`, `<page_footer>`, `<page_number>` tags. The model is trained to wrap the result in a markdown fence.

Ollama **returns the transcription only**. Layout boxes need the HF box tools / attention maps, which Ollama does not expose. Out of scope.

### RAM / memory (no single official "needs X GB" figure)

- Confirmed download sizes: **5.8 GB** for `q8_0` / `latest`, **10.4 GB** for `bf16` (Ollama card; GGUF files are 5.2 + 0.7 GB and 9.7 + 0.7 GB).
- The Ollama card is explicit: those sizes are **"the weights plus the vision encoder, not the memory needed"** — a 300 DPI page (~8k image tokens) plus the 32k context and buffers come on top.
- `q8_0` was tested on Linux with an **NVIDIA L40S**. Windows and macOS "run the same files, but we have not validated them yet." `bf16-mlx` was tested on an **Apple M4 Max (36 GB)**.
- **Peak RAM for a 32k-context `q8_0` page is unverified** as a published number. Do not invent one. The mode banner should say "download is 5.8 GB; peak RAM is higher (image tokens + 32k context)" and point at the Ollama card.

### Hosted API (exists; not this demo's default)

- Yes. **LlamaParse** (LlamaCloud) is powered by OCRia-1. The official docs: the `cost_effective` and `agentic` tiers use it on `"version": "latest"`, with no extra model setting. Custom prompts on `agentic_options.custom_prompt` switch to a general-purpose model — leave the custom prompt empty to stay on OCRia-1.
- Auth: `LLAMA_CLOUD_API_KEY`. SDKs: `llama_cloud` (Python) and `@llamaindex/llama-cloud` (TypeScript), plus REST.
- The HF card also notes that the OCRia-1 serving LlamaParse is the same model, quantized and served with a speculative decoder and custom kernels, "about ten times faster" than the unoptimized BF16 weights.
- This demo stays **local Ollama first**. Do not call LlamaParse in the MVP. A hosted path is deferred.

## Open questions (do not invent; isolate behind the adapter)

- Peak RAM / VRAM for `llamaindex/ocria-1:q8_0` at the 32,768 default context on a laptop GPU, Apple Silicon, or CPU-only. Unverified.
- Whether Ollama `/v1/chat/completions` with a data-URI `image_url` part and `think: false` is wire-equivalent to native `/api/chat` for this model. Prefer native until a live run confirms it.
- Windows / macOS quality: the publisher has not validated those platforms yet.
- The 256K context shown on the Ollama tag table vs the 32,768 default in the same card. Use 32,768 unless a live run needs more.
- Exact Ollama-cloud or LlamaParse latency / pricing for a comparable page: not needed for this local desk.

## Age-compliant pins (bunfig minimumReleaseAge = 259200)

Reuse the shared Vite/shadcn set already in tree: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7`, `@vitejs/plugin-react@5.2.0`, `typescript@5.8.3`, `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `@types/bun@1.4.4` (1.4.5, published 2026-11-20 02:06:17 UTC, also clears the gate), `@types/node@24.19.2`, `@types/react@19.1.13`, `@types/react-dom@19.1.9`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0` (1.77.0, published 2026-11-20 06:17:09 UTC, also clears the gate — 1.78.0 from 2026-11-23 and 1.79.0 from 2026-11-24 do **not**), `@base-ui/react@1.9.0`, `@fontsource-variable/geist@5.3.0`, `shadcn@4.23.0`, `class-variance-authority@0.7.1`, `cn@0.5.2`, `next-themes@0.4.6`, `tw-animate-css@1.4.0`, `eslint@9.36.0`, `@eslint/js@9.36.0`, `eslint-plugin-react-hooks@5.2.0`, `eslint-plugin-react-refresh@0.4.20`, `globals@16.4.0`, `typescript-eslint@8.44.0`.

App-specific pins that clear the gate (checked 2026-11-25):

- **`pdfjs-dist@6.5.438`** (published 2026-11-01) — render a chosen PDF page to a PNG/JPEG in the browser, targeting **300 DPI** (`scale ≈ 300/72`).
- **`react-markdown@10.1.0`** + **`remark-gfm@4.0.1`** + **`rehype-raw@7.0.0`** + **`rehype-sanitize@6.0.0`** — render the Markdown pane, including the HTML tables the model emits, through a tight sanitizer (table / thead / tbody / tr / th / td / colspan / rowspan / br, plus the page-furniture tags if you surface them). Do not render unsanitized model HTML.
- `openai@7.62.0` is optional (only if you also implement the `/v1` adapter). **7.63.0** (2026-11-23) and **7.64.0** (2026-11-24) fail the 3-day gate. The official live path is raw `fetch` to `/api/chat`, so the OpenAI SDK is not required.
- `ollama@0.6.4` (published 2026-09-29) is optional; `fetch` is enough for the native API.

Do not add Playwright unless its resolved version already clears the gate — `bun test` unit/API tests are the required suite.

## Single-user MVP

In:

- **Drop zone**: accept a PNG / JPEG / WebP screenshot or scan, or a PDF. For a PDF, show a simple page picker (default page 1) and render that page to an image at ~300 DPI with `pdfjs-dist` before sending. Reject empty files and non-image/non-PDF types with a clear error. Cap file size reasonably and say so in the UI.
- **Side-by-side desk**: original page image on the left; sanitized Markdown (with HTML tables rendered) on the right. A **Copy Markdown** button copies the raw model text (fence already stripped).
- **Table lens**: every HTML table in the output becomes a **sortable grid** (click a header to sort) with a **CSV export** for that table. Preserve header cells when present. Merged cells (`colspan` / `rowspan`) must not crash the parser — expand or flatten them into a rectangular grid honestly (document the rule in a code comment and test it). If there are no tables, say so; do not invent one.
- **Two clearly separated modes:**
  - **Live** (Ollama reachable at a loopback `OLLAMA_HOST` / `http://127.0.0.1:11434`, model `llamaindex/ocria-1` unless `OLLAMA_MODEL` is set, and no `MOCK=1`): native `/api/chat` with `think: false`, empty user content, `images: [base64]`, temperature 0, 32,768 context, 24,576 `num_predict`, `keep_alive: "5m"`. Surface latency, `done_reason`, and a length-cutoff warning. Never expose any key to the browser (Ollama local ignores the key; still keep env off the client bundle).
  - **Recorded demo (default, no live server or `MOCK=1`)**: a shipped fixture page (hand-authored fictional table / form — clearly labelled as a sample, not model output and not an official LlamaIndex asset) plus recorded Markdown (with at least one HTML table, including a merged-cell example). The UI, README, and PR must badge this as **"Recorded demo mode — no model loaded, no network calls"**. Dropping a user file in mock mode must **not** invent a new transcription — show "Live mode needed to read your own page. Install Ollama 0.40.18+, run `ollama pull llamaindex/ocria-1`, then unset MOCK / point `OLLAMA_HOST` at loopback." and keep the original image preview (same honesty rule as Hy4 / Inkling Mini).
- **Mode banner** with exact live setup: Ollama 0.40.18+, `ollama pull llamaindex/ocria-1`, `ollama run llamaindex/ocria-1 --think=false`, env vars, `bun install && bun run dev`, the 5.8 GB download + "peak RAM is higher" note, and the license one-liner.
- **Metrics strip** after a run: wall-clock ms, (optional) prompt/eval token counts if Ollama returns them, model id, source `live` | `mock`. Do not show official ParseBench numbers.
- **Run:** `cd apps/ocria-table-lens && bun install && bun run dev` (recorded demo by default). Tests pass in CI with no model.
- The cloud agent appends **one row** to the root README Demos table and includes at least one screenshot **and** one video of the running **recorded** desk (load fixture, side-by-side Markdown, sortable grid, CSV export, copy Markdown, recorded-demo badge).

Out: LlamaParse / LlamaCloud as a default path, OCRia-nano-1 / LiteParse, layout boxes, multi-page batch jobs, downloading or serving the GGUF inside this app, official benchmark badges, competing-parser productization, auth/accounts, deployment, Playwright e2e unless a gate-clear version is already in tree.

## Architecture

```
Vite + React + shadcn desk
  DropZone + PdfPagePicker + SourcePane + MarkdownPane
    ──▶ POST /api/transcribe ──▶ server/transcribe.ts
  TableGrid[] + CsvExport + CopyMarkdown + MetricsStrip + ModeBanner
       ◀── JSON TranscribeResult

server/
  adapter/types.ts    TranscribeRequest { imageBase64, mimeType }
                      TranscribeResult { markdown, tables, wallMs,
                        doneReason, source: 'live'|'mock', model,
                        usage? }
  adapter/ollama.ts   native POST /api/chat (think: false, images, empty content)
  adapter/mock.ts     recorded markdown + tables; same result shape
  markdown.ts         strip ```markdown fences; extract HTML tables
  tables.ts           parse HTML tables (colspan/rowspan) → grid rows
  csv.ts              RFC4180-ish CSV (quotes, commas, newlines)
  env.ts              OLLAMA_HOST / OLLAMA_MODEL / MOCK=1; loopback check

shared/
  fixtures/           sample page image + recorded.md + meta.json
  prompt.txt          copy of the HF prompt, for documentation / /v1 only
                      (do not send a custom system prompt on the Ollama path)
```

One adapter interface drives both modes so the desk behaves identically. Keep wire details inside the Ollama adapter. PDF rendering stays in the browser (`pdfjs-dist`); the server receives an already-rendered page image.

## Stack (one line each)

- **Bun**: repo standard for install, scripts, tests, and the HTTP API.
- **Vite + React + TS** (`bunx create-vite`, skip install, write `bunfig.toml` before `bun install`): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, ScrollArea, Table, Tooltip, Sonner on demand.
- **Native Ollama `/api/chat`**: official OCRia-1 image recipe (`images`, empty content, `think: false`).
- **pdfjs-dist@6.5.438**: render one PDF page to an image at ~300 DPI.
- **react-markdown + remark-gfm + rehype-raw + rehype-sanitize**: safe Markdown / HTML-table preview.
- **zod**: request/response validation.

## Tasks (vertical slices)

1. Scaffold the app with `bunx create-vite` (skip install), write `bunfig.toml` with `minimumReleaseAge = 259200` **before** any install, pin the dependency set, prove `bun install` and `bun run build`.
2. Implement fence stripping, HTML-table extraction, colspan/rowspan flattening, CSV serialization, the adapter interface, the recorded mock adapter + fixture page (hand-authored image + Markdown with at least one merged-cell table), and unit tests (fence strip, table parse, merged cells, CSV quoting, mock badge fields, "user upload in mock does not invent a transcription", loopback host check).
3. Build the drop zone, PDF page picker, side-by-side panes, sortable grids, CSV export, copy-Markdown, metrics strip, recorded / live badges, mode banner, and an end-to-end mock run.
4. Implement the live Ollama adapter (`/api/chat`, `think: false`, empty content, images, 32k / 24,576, length warning). Typecheck without a local server. `/api/mode` must never include secrets. Document exact live setup and any remaining open questions honestly in the README / Implementation notes after the first successful live call (or state live is untested).
5. Validate the production build and tests (`bun test` must pass with no model); capture a screenshot and a video of the running **recorded** desk showing the fixture page, side-by-side Markdown, a sorted grid, CSV export, copy Markdown, and the recorded-demo badge. If a local `llamaindex/ocria-1` server is available, also verify a live run and report latency + `done_reason`; otherwise state live is untested. Video must be mp4 **h264 / yuv420p**.

## Build constraints (cloud agent)

- Touch **only** `apps/ocria-table-lens/` plus **one** new row in the root README Demos table. Do not edit other apps, skills, or tracker files. Never create a new repo.
- Open **one PR** against `https://github.com/AseemWangoo/x-bookmark-demos` (this repo). The PR body must include at least **one screenshot AND one video** (mp4 h264/yuv420p) of the running app exercising the real flow (fixture page, side-by-side Markdown, sortable grid, CSV export, copy Markdown, recorded-demo badge). Recorded demo mode is fine.
- `bun install`, `bun test`, and `bun run build` must pass cleanly. Do not weaken `bunfig.toml` `minimumReleaseAge = 259200`. Do not bump `openai` past 7.62.0 or `lucide-react` past 1.77.0 until newer publish dates clear the 3-day gate.
- Honest labelling of recorded vs live in the UI, README, and PR body. Do not download the 5.8 GB (or 10.4 GB) weights in CI. Do not claim official ParseBench numbers. Do not present the fixture transcription as model output.

## Deferred

LlamaParse / LlamaCloud as a default path, OCRia-nano-1 / LiteParse, layout boxes, vLLM / llama.cpp as a first-class path (document only), Ollama cloud, multi-page batch jobs, downloading or bundling weights, official benchmark badges in the UI, Playwright e2e unless a gate-clear version is already in tree, deployment.

## Post notes

Honest framing: a page-to-Markdown table lens on **OCRia-1** (LlamaIndex 4B document VLM, fine-tuned from Qwen3.5-4B; open weights under the OCRia-1 Model and Code License / Open RAIL-M, not Apache); live path talks to local Ollama **`llamaindex/ocria-1`** (default `q8_0`, 5.8 GB download, `think: false`, one page image per request); the video uses recorded demo mode if no local model was loaded. Tag at most three verified handles: `@llama_index` (id 1604278358296055808, business), `@jerryjliu0` (id 369777416, blue), `@ollama` (id 1688410127378829312, business) — reconfirm at post time. Do not claim the fixture Markdown was model-generated, and do not invent a peak-RAM number.
