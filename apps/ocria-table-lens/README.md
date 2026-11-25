# OCRia Table Lens

A one-screen desk that turns a scanned page, a screenshot, or a PDF page into Markdown. **OCRia-1** (LlamaIndex, 4B, fine-tuned from Qwen3.5-4B) reads one page image through a local Ollama server. HTML tables in that Markdown become a sortable grid with CSV export. There is a Copy Markdown button.

This is a local page-to-Markdown desk. It is not LlamaParse and it is not LiteParse or OCRia-nano-1. The sample page, the recorded Markdown, and the grid you see in recorded demo mode were written by hand. They were not produced by the model, and they are not LlamaIndex assets. Official ParseBench numbers are omitted on purpose.

OCRia-1 weights and the `ocria_grounding/` code use the [OCRia-1 Model and Code License](https://huggingface.co/llamaindex/OCRia-1/blob/main/LICENSE) (based on AI Pubs Open RAIL-M). The Hugging Face card is explicit that the code is not open source. The Qwen3.5-4B base is Apache-2.0. The license is free for personal use and for research (academic and non-profit research, teaching, evaluation, and internal R&D that does not ship). It is free for commercial use by organizations under $2M annual revenue and under $2M total funding. A commercial license is required above those thresholds, and for any use in a document parsing, OCR, or extraction product that competes with LlamaParse or LlamaCloud. You own the outputs. This desk is a personal research and evaluation tool.

Sources: [llamaindex/OCRia-1](https://huggingface.co/llamaindex/OCRia-1), [OCRia-1-GGUF](https://huggingface.co/llamaindex/OCRia-1-GGUF), [Introducing OCRia-1](https://www.llamaindex.ai/blog/parse-ocria-1), [Ollama library](https://ollama.com/llamaindex/ocria-1), [technical report](https://arxiv.org/abs/2611.00092), and [@jerryjliu0](https://x.com/jerryjliu0/status/2125266115874144473). The report was first posted on arXiv on 22 Oct 2026. The weights and the Ollama tag were posted on 24 Nov 2026. Those are two dates, not one event.

## Run

```bash
cd apps/ocria-table-lens
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No model is required. With Ollama unreachable, or with `MOCK=1`, the desk stays in **Recorded demo mode — no model loaded, no network calls**. Click **Load sample page**. The page image is a screenshot of `shared/fixtures/page.html`. The Markdown next to it is `shared/fixtures/recorded.md`. Both are hand-authored.

`bun test` and `bun run build` pass with no model. Do not download the 5.8 GB `q8_0` weights, or the 10.4 GB `bf16` weights, for CI.

A file that is not the sample is refused in recorded mode:

> Live mode needed to read your own page. Install Ollama 0.40.18+, run `ollama pull llamaindex/ocria-1`, then unset MOCK / point `OLLAMA_HOST` at loopback.

The original image stays on the left. The desk does not invent a transcription.

## Live mode

Outbound chat is allowed only to a loopback host (`127.0.0.1`, `localhost`, `::1`). Anything else stays on the recording and sends no image.

```bash
# Ollama 0.40.18 or later. Default tag is q8_0, a 5.8 GB download.
# The download size is the weights plus the vision encoder, not peak RAM.
ollama pull llamaindex/ocria-1
ollama run llamaindex/ocria-1 --think=false

OLLAMA_HOST=http://127.0.0.1:11434 OLLAMA_MODEL=llamaindex/ocria-1 bun run dev
```

The live adapter is a native `POST /api/chat`. It does not send a system prompt. The Ollama model already ships with `prompt.txt`. `shared/prompt.txt` is a copy of that file for documentation. It is not sent.

The request body is:

- `model`: `llamaindex/ocria-1`, unless `OLLAMA_MODEL` is set
- `think`: `false`
- `stream`: `false`
- `keep_alive`: `"5m"`
- one user message with `content: ""` and `images: [base64]` (no `data:` prefix)
- `options.temperature`: `0`
- `options.num_ctx`: `32768`
- `options.num_predict`: `24576`

A wrapping ` ```markdown ` fence is stripped. If `done_reason` is `length`, the desk warns that the page was cut off. PDF pages are rendered in the browser with `pdfjs-dist` at 300 DPI (`scale = 300/72`) before that image is posted. Pages above 16.7 million pixels are scaled down and the desk says so.

`GET /api/mode` returns the mode, the model id, whether the host is loopback, and the setup lines. It does not return environment values that are not the model id. Ollama does not need a key. If one is set in the environment, it is not forwarded and not included in `/api/mode`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Loopback origin only. A non-loopback value keeps recorded mode |
| `OLLAMA_MODEL` | `llamaindex/ocria-1` | Model tag. `bf16` is the larger tag, not the default |
| `MOCK=1` | unset | Force the recording even if Ollama is up |
| `PORT` | `8787` | Bun API port |

## Tables

OCRia-1 emits tables as HTML, including `colspan` and `rowspan`. The grid flattens each cell into a rectangle. The text stays in the top-left cell of that rectangle. Every other cell in the span is blank. Rows are padded so the grid is rectangular. The last `<thead>` row is the column header. Earlier header rows become the caption. A `<tfoot>` stays under the body and is not sorted. If a table has no header cells, columns are labelled Column N and the grid says so. Click a header to sort. CSV is RFC 4180-style: comma, quote, and newline fields are quoted, quotes are doubled, lines end in CRLF.

## Implementation notes

Live mode was **not** run. This environment had no Ollama server on `127.0.0.1:11434`, and the 5.8 GB weights were not downloaded. The screenshot and the video are the recorded desk.

Still open, and isolated from the native `/api/chat` path:

1. Peak RAM for `llamaindex/ocria-1` (`q8_0`) at the 32,768 context on a laptop GPU, Apple Silicon, or CPU. The Ollama card does not publish a number. The banner does not invent one.
2. Whether `POST /v1/chat/completions` with a data-URI image and `think: false` matches native `/api/chat` for this model. This desk does not call `/v1`.
3. Windows and macOS quality. The publisher has not validated those platforms yet. `q8_0` was tested on Linux with an NVIDIA L40S.
4. The Ollama tag table lists 256K context. The same card's serving default is 32,768. This desk sends 32,768.

The OpenAI-compatible path and LlamaParse are not wired up. `openai` is not a dependency.
