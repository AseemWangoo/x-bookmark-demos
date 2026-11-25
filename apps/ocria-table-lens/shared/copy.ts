export const MOCK_BANNER = "Recorded demo mode — no model loaded, no network calls";

export const LIVE_BANNER = "Live — local Ollama";

export const LIVE_REQUIRED =
  "Live mode needed to read your own page. Install Ollama 0.40.18+, run `ollama pull llamaindex/ocria-1`, then unset MOCK / point `OLLAMA_HOST` at loopback.";

export const MODEL_BADGE = "4B VLM";

export const MODEL_NOTE =
  "OCRia-1 is a 4B vision-language model from LlamaIndex, fine-tuned from Qwen3.5-4B. The Hugging Face card also lists a 5B size that is not broken down. This desk calls it 4B, matching the product name, and does not download the weights.";

export const RAM_NOTE =
  "Download is 5.8 GB; peak RAM is higher (image tokens + 32k context). See the Ollama card. No peak-RAM figure is published for a 32k-context q8_0 page.";

export const LICENSE_NOTE =
  "OCRia-1 weights and the ocria_grounding code use the OCRia-1 Model and Code License (based on AI Pubs Open RAIL-M), not Apache-2.0. Free for personal use and for research. Commercial use above $2M annual revenue or $2M total funding, or any use in a document-parsing product that competes with LlamaParse or LlamaCloud, needs a commercial license. You own your outputs. This desk is a personal research and evaluation tool.";

export const DEFAULT_MODEL = "llamaindex/ocria-1";

export const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";

export const NUM_CTX = 32_768;

export const NUM_PREDICT = 24_576;

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export const MAX_PIXELS = 16_700_000;

export const PDF_DPI = 300;

export const SAMPLE_LABEL = "Hand-authored sample. Not model output. Not a LlamaIndex asset.";

export const FLATTEN_NOTE =
  "Merged cells keep their text in the top-left cell. The rest of the span is blank, so a sorted column can show an empty cell where a rowspan or colspan used to cover.";

export const NO_TABLES = "No HTML tables in this transcription.";

export const LENGTH_WARNING =
  "Output was cut off because done_reason is length. Raise num_ctx and num_predict. This request already used a 32,768 context and 24,576 output tokens.";
