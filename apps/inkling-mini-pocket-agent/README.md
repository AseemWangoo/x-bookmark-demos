# Inkling Mini Pocket Agent

A one-screen, offline-first pocket agent. Point it at a local folder of notes and receipts, or use the shipped sample pocket, and Inkling 2 Mini sorts, tags, and summarizes the files through sandboxed tool calls: `list_files`, `read_file`, `tag_file`, `write_summary`. There is no delete tool.

This is a private local-folder desk. It is not Tinker Playground and it is not a hosted Inkling chat. The sample notes, the receipt image, the tags, and `pocket-summary.md` are hand-authored. They were not produced by the model, and they are not Thinking Machines assets. Official benchmark figures are omitted from the desk on purpose.

Inkling 2 Mini is a Thinking Machines open-weight looped mixture-of-experts model: 26.4B total parameters, 5.4B effective-active per token, about 20 GB, up to 1M context, Apache 2.0. The desk badge says **26.4B total · 5.4B effective-active · looped**. A laptop path means a machine with 32 GB or more of memory, not a 16 GB machine. This app does not download the weights.

Sources: [Introducing Inkling 2 Mini](https://thinkingmachines.ai/news/inkling-2-mini/), [model card](https://thinkingmachines.ai/model-card/inkling-2-mini/), [thinkingmachines/Inkling-2-Mini](https://huggingface.co/thinkingmachines/Inkling-2-Mini), [ggml-org/Inkling-2-Mini-GGUF](https://huggingface.co/ggml-org/Inkling-2-Mini-GGUF), [Ollama library](https://ollama.com/library/inkling-2-mini), and [@thinkymachines](https://x.com/thinkymachines/status/2123871643797995872).

## Run

```bash
cd apps/inkling-mini-pocket-agent
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

No model is required. With `LOCAL_LLM_BASE_URL` unset, the desk stays in **Recorded demo mode — no model loaded, no network calls**. Click **Sample pocket**, then **Run agent**. The tool-call trace, tags, summary, TTFT, and tokens/sec are the shipped recording. Tokens/sec is `completion tokens after first token ÷ generation seconds`. The offline badge stays off, because nothing was sent.

`bun test` and `bun run build` pass with no model.

A folder that is not the sample pocket is listed and then refused in recorded mode: **Live mode needed to read your own folder. Start Ollama or llama-server and set `LOCAL_LLM_BASE_URL`.** The desk does not invent a summary.

## Live mode

Outbound chat completions are allowed only to a loopback host (`127.0.0.1`, `localhost`, `::1`). The offline badge turns green only in that live mode. A Tinker or any other non-loopback URL keeps the badge off and the server sends no request. Redirects off loopback are refused.

```bash
# Apple Silicon. The official Ollama tag is MLX. Do not claim this works on Linux or Windows.
ollama run inkling-2-mini
LOCAL_LLM_BASE_URL=http://127.0.0.1:11434/v1 LOCAL_LLM_MODEL=inkling-2-mini bun run dev

# llama.cpp GGUF. Do not start llama-server with --tools all. This app sends its own tools.
llama serve -hf ggml-org/Inkling-2-Mini-GGUF:IQ4_NL
LOCAL_LLM_BASE_URL=http://127.0.0.1:9931/v1 LOCAL_LLM_MODEL=inkling-2-mini bun run dev
```

The API key is read by the Bun process only. Ollama ignores it. `GET /api/mode` returns the host, model, mock vs live, and whether the host is loopback. It does not return the key.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOCAL_LLM_BASE_URL` | unset | OpenAI-compatible base, including `/v1`. Unset stays in recorded mode |
| `LOCAL_LLM_MODEL` | `inkling-2-mini` | Model id the local server advertises |
| `LOCAL_LLM_API_KEY` | `local` | Required by the OpenAI SDK, ignored by local servers |
| `LOCAL_LLM_REASONING_EFFORT` | `low` | `none` `minimal` `low` `medium` `high` `xhigh` `max`. The chat template's own default is 0.9 when the field is omitted. Minimum effort does not fully disable the loop |
| `MOCK=1` | unset | Force the recording even if a URL is set |
| `POCKET_FOLDER` | unset | Prefills the custom-folder field. The sample pocket stays the recorded path |
| `POCKET_STREAM_DELAY_MS` | `420` under `bun run dev`, else `0` | Pause between recorded tool calls so the trace is visible |
| `PORT` | `8787` | Bun API port |

Live calls use `openai@7.62.0` Chat Completions (`POST /v1/chat/completions`) with `tools`, `stream: true`, and `reasoning_effort`. TTFT is the time to the first content, reasoning, or tool-call delta. The loop stops at `write_summary` or 12 turns. Image receipts are attached as image parts on the tool message. The pinned SDK types that content as text, so the image part is a narrow assertion matching the Inkling chat template. Free-form assistant text is not parsed as a tool call.

## Implementation notes

Live mode was **not** run. This environment had no local Inkling 2 Mini server on `127.0.0.1:11434` or `127.0.0.1:9931`. The video is the recorded desk.

Still open, and isolated in `server/adapter/local.ts`:

1. The exact live tool-call wire shape on Ollama versus llama-server for this model (argument JSON as a string or an object, `reasoning_content` versus Ollama `thinking`, parallel calls). The adapter accepts string or object arguments and reads both reasoning fields. Nothing here was confirmed against a loaded model.
2. Whether a given llama.cpp build's bundled chat template emits tool calls for `inkling2_loop`. The official repo ships `chat_template.jinja` with `tool_declare`. If a build drops tools, the run stops with "Model finished without write_summary" instead of inventing calls from prose.
3. Practical context length and tokens/sec on a real machine. The desk shows measured numbers in live mode and the recorded fixture numbers in demo mode. It does not invent a live rate.
4. Ollama's official library model is MLX. As of the plan (Ollama issue #19817, updated 2026-11-22), loading official or third-party GGUF through Ollama's bundled llama.cpp failed with `unknown model architecture: 'inkling2_loop'`. The Linux live path is llama.cpp, not `ollama run`.
