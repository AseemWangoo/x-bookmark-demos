# Terra Drawing-to-Form

A one-screen visual extraction demo: choose a technical drawing, handwritten form, or spec sheet; inspect the source box and model-reported confidence for every field; correct values; export typed JSON.

## Run

```bash
cd apps/terra-drawing-to-form
bun install
bun run dev
```

Without environment variables the app runs in mock mode. It only replays the three bundled, hand-written fixtures marked `synthetic: true`; their timing and token counts are illustrative. An uploaded image is displayed but never assigned invented values.

For live extraction:

```bash
OPENAI_API_KEY=… bun run dev
```

The key is read by the Bun API only. It is never returned to or bundled with the browser. Optional settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TERRA_MODEL` | `gpt-6.1-terra` | Override the model alias |
| `TERRA_EFFORT` | `medium` | `none`, `low`, `medium`, or `high` |
| `MOCK=1` | unset | Force mock mode even when a key exists |
| `MOCK_SPEED` | `1` | Divide fixture latency for local capture |
| `PORT` | `8787` | Bun API port |

## Model and implementation

Live mode uses the OpenAI Responses API with `gpt-6.1-terra`, `input_image` detail `original`, reasoning effort, and a strict JSON schema. Images are oriented and resized in the browser to a 2048 px long side before upload. The server asks for pixel boxes, clamps and normalizes them, coerces values to the selected template’s types, and prices returned usage at $1 / 1M input tokens and $5 / 1M output tokens.

Verified from OpenAI’s [GPT-6.1 Terra model page](https://developers.openai.com/api/docs/models/gpt-6.1-terra): model ID, Responses support, image input, structured outputs, reasoning effort, context/output limits, and standard pricing. The app’s assumed image-sizing behavior, model-reported boxes, and self-reported confidence are claims rather than ground truth; the interface labels them accordingly.

The three sample documents and all names, companies, identifiers, and measurements in them are fictional.

## Scripts

```bash
bun test          # critical schema, coercion, bbox, fixture, export, and handler logic
bun run build     # type-check and production client build
bun run samples   # regenerate PNG samples and exact source regions from SVG
bun run capture   # record screenshot + H.264 demo video in mock mode
bun run record    # replace fixtures with live responses (requires OPENAI_API_KEY)
```
