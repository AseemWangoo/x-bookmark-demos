# Terra Drawing-to-Form: PLAN

Sources (all read 2026-10-30):
- [OpenAI: Introducing GPT-6.1 Terra](https://openai.com/index/introducing-gpt-6-1-terra/) (launch post; "interpreting technical drawings to filling out forms")
- [GPT-6.1 Terra model page](https://developers.openai.com/api/docs/models/gpt-6.1-terra) (`.md` version read: id, limits, prices, endpoints, features)
- [Using GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model) (reasoning effort, unsupported params)
- [Images and vision guide](https://developers.openai.com/api/docs/guides/images-vision) (`input_image`, `detail`, coordinate advice)
- [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) (`text.format` `json_schema` + `strict`)
- [npm: openai](https://www.npmjs.com/package/openai) (`npm view openai time`)
- Bookmark: [X trending topic](https://x.com/i/trending/2115503723283624109). Not read (x.com blocks the fetcher); every fact below comes from OpenAI's pages.

## What GPT-6.1 Terra is (verified 2026-10-30)
- **Model id: `gpt-6.1-terra`.** Stated on the model page ("Model ID", default snapshot and only alias) and in the launch post ("Developers can also access it through the OpenAI API as `gpt-6.1-terra`"). Still read it from `TERRA_MODEL` (default `gpt-6.1-terra`) so a future dated snapshot is a one-line env change.
- OpenAI's mid-tier GPT-6 model ("fast and efficient", between GPT-6.1 Sol and GPT-6 Luna), built for visual reasoning, precise computer use and clear writing. Launched 2026-10-26.
- Input: text + image (PNG, JPEG, WEBP, non-animated GIF). Output: text. Context 1,050,000. Max output 128,000. Knowledge cutoff 2026-06-01.
- Endpoints: Responses (`POST /v1/responses`), Chat Completions, Batch. **Use Responses.**
- Features: structured outputs, image input, streaming, function calling, prompt caching.
- `reasoning.effort`: `none`, `low`, `medium` (default), `high`, `xhigh`, `max`. When effort is not `none`, **do not send** `temperature`, `top_p` or `top_logprobs`. That means no logprobs, so confidence has to be self-reported by the model (see below).
- Pricing (Standard): **$1 / 1M input**, $0.05 / 1M cached input, **$5 / 1M output**. Prompts over 272K input tokens cost 2x input and 1.5x output (not reachable here). Image patches are billed as input tokens.
- Images: `input_image` with `image_url` as a base64 data URL. `detail`: `low | high | original | auto`. The vision guide says to use `"original"` for OCR and coordinate-sensitive work, and for coordinate tasks to "resize images to fit those limits before sending them and map returned coordinates back to the original image". Each image is limited to 30,000 32px patches.

### Not verified (decide in code, isolate in one file)
- **Terra's per-model sizing row.** The vision guide's sizing table lists `gpt-6-astra` and the `gpt-5.6-*` family, but not `gpt-6.1-terra`. Assume it behaves like `gpt-6-astra` (`original` keeps the dimensions). The app downsizes every image itself to a **2048 px long side** before sending, so the coordinate space is known either way.
- **The image-token multiplier for Terra** isn't listed. Use the `usage` the API returns and don't estimate image tokens up front.
- **Bounding-box accuracy.** The guide warns that "spatial reasoning ... precise spatial localization" is a known weakness. Boxes are the model's own claim, so show them with confidence and don't present them as ground truth.
- **Confidence calibration.** It is a self-reported number in the JSON, not a probability from the API. Label it "model-reported confidence" everywhere.

The `server/terra.ts` adapter and `src/lib/pricing.ts` are the only places that should need changes if any of this turns out different.

## Goal
Build a one-screen app. You upload a photo or scan of a form, a technical drawing, or a spec sheet. GPT-6.1 Terra reads it and fills a structured form. Each field shows the image region its value came from (a box overlay) and a confidence score. You can edit any value and export the result as JSON.

## Single-user MVP
In:
- **Three bundled samples**, each with a field template and a mock response. They are generated from SVG at known coordinates (see Samples), so the boxes in the mocks are exact:
  1. `bracket-drawing`: a mechanical part drawing (an L-bracket). It has a title block (part no., title, material, finish, scale, drawn by, date, revision, sheet) and dimensions (overall length/height/thickness, hole Ø, hole count, general tolerance).
  2. `service-request-form`: a filled-in equipment service request form with printed labels, "handwritten-style" values (a script font), checkboxes, a date and a signature line. One field is blank on purpose (expected `null`) and one is smudged or ambiguous (low confidence).
  3. `motor-spec-sheet`: a motor datasheet table (model, rated power kW, voltage, current A, rpm, frequency Hz, IP rating, insulation class, efficiency %, weight kg).
- **Templates** (`src/templates/*.ts`, one constant per kind): an ordered list of `{ key, label, type: "text" | "number" | "date" | "enum" | "boolean", unit?, options?, hint? }`. Upload flow: pick a template (default: the one matching the sample, or "Technical drawing" for uploads).
- **Upload**: drag and drop or a file picker for PNG/JPEG/WEBP up to 10 MB. Downscale in the browser with a canvas to a 2048 px long side (keep the aspect ratio, never upscale) and send `{ imageDataUrl, width, height }`. Apply EXIF orientation via `createImageBitmap(file, { imageOrientation: "from-image" })`.
- **Extraction** (`POST /api/extract`): returns one result per template field: `{ key, value, confidence (0..1), bbox: { x, y, w, h } | null, note? }`, where bbox is **normalized 0..1** relative to the sent image.
- **Image viewer with overlay**: the image plus an absolutely positioned SVG layer in the same aspect box. One rectangle per field with a value (colour by confidence: ≥0.85 green, 0.6–0.85 amber, <0.6 red) and a small key label. Hovering a field highlights its box (and dims the others), and hovering or clicking a box focuses its field. Fit to width, plus a simple 1x/2x zoom toggle. No pan or zoom library.
- **Form panel**: one row per field. It shows the label + unit, an editable shadcn `Input` (a `Select` for enum, a `Checkbox` for boolean), a confidence `Badge` with the %, a "no region" note when `bbox` is null, a **Null** state for missing values, and an **edited** badge after a change. Each edited row has a reset-to-model-value button. Sort toggle: template order or lowest confidence first ("review queue").
- **Export JSON**: a Download (`<sample-or-file>.terra.json`) and Copy button. Shape:
  ```json
  { "source": { "name", "width", "height" }, "template": "bracket-drawing", "model": "gpt-6.1-terra", "mode": "mock|live",
    "extractedAt": "ISO", "fields": [{ "key", "label", "value", "modelValue", "edited", "confidence", "bbox" }],
    "usage": { "inputTokens", "outputTokens", "costUsd" } }
  ```
  Values are typed: numbers as JSON numbers, dates as `YYYY-MM-DD`, booleans as booleans.
- **Run panel** (small footer card): mode, model id, reasoning effort, latency in ms, input/output tokens and estimated cost ($1/$5 per M, from `pricing.ts` with the source URL). Mock numbers are labelled "illustrative".
- **Reasoning effort select**: `none | low | medium | high` (default `medium`). Live mode only; it's disabled in mock mode.
- **Mock mode (default when `OPENAI_API_KEY` is unset)**:
  - The header badge reads **Mock: bundled samples**, and a banner says no API calls are made.
  - Picking a sample replays `fixtures/<sample>.mock.json` after its `latencyMs` (scaled to about 1–1.5 s) so the loading state is visible.
  - Mock files are hand-written to the response schema and carry `"synthetic": true`. One field in each has a deliberately imperfect value or a low confidence, so the review queue has something in it.
  - Uploading your own image in mock mode shows "Live mode needed to read your own image. Set `OPENAI_API_KEY`." and still displays the image. **Never return invented values for an unknown image.**
- **Live mode** (when `OPENAI_API_KEY` is set; a header toggle can force mock):
  - The server calls the Responses API (below). Samples can also be sent live, so mock and live can be compared on the same image.
  - The key stays on the server and is never returned, logged or bundled. `GET /api/mode` returns only `{ mode, model }`.
- **Run**: `cd apps/terra-drawing-to-form && bun install && bun run dev`.

Out (explicitly):
- auth, persistence, history, multi-user, batch, PDFs and multi-page documents
- custom template builder and auto-detecting fields (see Deferred)
- computer-use tool calls (filling a real third-party web form)
- server-side image processing (all resizing happens in the browser)
- deskew, perspective correction and OCR fallback

## Terra request (server/terra.ts)
```ts
client.responses.create({
  model: env.TERRA_MODEL,                       // default "gpt-6.1-terra"
  reasoning: { effort },                        // none|low|medium|high
  input: [
    { role: "developer", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
    { role: "user", content: [
      { type: "input_text", text: renderTemplatePrompt(template, width, height) },
      { type: "input_image", image_url: imageDataUrl, detail: "original" },
    ]},
  ],
  text: { format: { type: "json_schema", name: "form_extraction", strict: true, schema: buildSchema(template) } },
  max_output_tokens: 4000,
  store: false,
});
```
- **Coordinates**: the prompt states the exact pixel size of the image being sent (`width × height`) and asks for `bbox_px: [x0, y0, x1, y1]` in those pixels (integers, top-left origin), or `null`. The server clamps, orders and normalizes the box to 0..1 (`server/bbox.ts`). This follows the vision guide's "resize, then map coordinates back" advice.
- **Schema** (`buildSchema`, strict, so every property is required and `additionalProperties: false`): `{ fields: [{ key: enum(template keys), value: string | null, confidence: number, bbox_px: [int,int,int,int] | null, note: string | null }] }`. Values come back as strings, and the server coerces them by template type (`server/coerce.ts`: numbers strip units and thousands separators; dates are parsed to ISO; booleans accept yes/no/✓/x). A value that fails coercion stays as the raw string with `note: "unparsed"` and its confidence is capped at 0.5.
- The system prompt says: read only what is visible; use `null` when a field is absent or illegible (never guess); confidence reflects legibility and ambiguity; bbox covers the value text, not the label; dimensions keep their stated units.
- Parse `response.output_text` with zod. Get usage from `response.usage` (`input_tokens`, `output_tokens`, `input_tokens_details.cached_tokens`), and measure latency with `performance.now()`.
- Errors: map 401 / 403 / 404 (model not available to this key) / 429 / 5xx / a schema parse failure to readable messages. 404 says "Your key can't use `<model>`; set `TERRA_MODEL`".

## App API (internal)
- `GET /api/mode` returns `{ mode: "mock" | "live", model }`.
- `GET /api/samples` returns `[{ id, title, kind, imageUrl, width, height, templateId }]`. Images are served from `public/samples/`.
- `GET /api/templates` returns all templates.
- `POST /api/extract` takes `{ templateId, sampleId?, imageDataUrl?, width, height, effort?, forceMock? }` and returns `{ mode, model, results: FieldResult[], usage, latencyMs, synthetic? }`, or `{ error, status }`. Validate it with zod: one of `sampleId`/`imageDataUrl`, a data URL prefix of `image/(png|jpeg|webp)`, a decoded size of at most 10 MB, and a long side of at most 2048. Mock mode with no `sampleId` returns `409 { error: "live_required" }`.

## Samples (how the bundled images are made)
- Author each sample as SVG in `samples/src/<id>.ts`, a function that returns `{ svg, width, height, regions: Record<fieldKey, {x,y,w,h}> }`. Every value's `<text>` sits at known coordinates, so **the region of each value is known exactly**.
- `bun run samples` (`scripts/build-samples.ts`) renders each SVG to PNG with `@resvg/resvg-js` (bundle a font such as Inter + a script font from `@fontsource`, passed to resvg via `font.fontFiles`), writes `public/samples/<id>.png`, and writes the normalized regions to `fixtures/<id>.regions.json`. Commit the PNGs and the regions. Rendering at runtime is not needed.
- For a "scan" feel, add a light paper tint, a faint grid on the drawing, and slight noise or a 0.5° skew on one sample. Keep the skew small and apply it to the regions too.
- The mock `bbox` values are the regions, with a few slightly offset or padded so they look like model output. Test 1 below keeps them honest.
- All content is fictional: no real companies, people or standard form numbers.

## Tasks (vertical slices, in order)
1. **Scaffold + guardrail.**
   - Create `apps/terra-drawing-to-form/bunfig.toml` FIRST:
     ```toml
     [install]
     minimumReleaseAge = 259200
     ```
   - Run `bunx create-vite@latest . --template react-ts` in the directory without installing, then `bun install`. Add Tailwind v4 and run `bunx shadcn@latest init` with the minimalist (neutral) preset.
   - `bun add openai zod` (expect `openai` 7.45.x under the 3-day rule; it only needs `responses.create` + `text.format`). Add `bun add -d @resvg/resvg-js playwright`.
   - Done when `bun run dev` shows a blank page.
2. **Samples.** Write the 3 SVG builders and `scripts/build-samples.ts`, then commit the PNGs + regions. Done when the three PNGs look like a drawing, a form and a datasheet.
3. **Bun API + mock end to end.**
   - `server/index.ts` runs `Bun.serve` routes (`/api/mode`, `/api/samples`, `/api/templates`, `/api/extract`), and Vite `server.proxy` forwards `/api`. `bun run dev` = `bun run --parallel dev:web dev:api` (same as the other apps).
   - Picking the bracket sample shows the image and a filled form.
4. **Overlay + linking.** The SVG overlay with confidence colours, hover/click linking in both directions, and the zoom toggle.
5. **Form editing + export.** Typed inputs, edited badge and reset, a Null state, review-queue sort, and JSON Download/Copy (built by a pure `buildExport()`).
6. **Upload.** Drag and drop, browser downscale (`src/lib/image.ts`), the template picker, and the live-required message in mock mode.
7. **Live mode.** `server/terra.ts`, `bbox.ts`, `coerce.ts`, `schema.ts` and `env.ts` (mode detection), the effort select, error mapping and the run panel with real usage. If a key is ever available, `bun run record` (`scripts/record.ts`) re-records the sample mocks from live calls and drops `synthetic`. **No key is available for this build**: ship the hand-written mocks marked `synthetic: true`, and say so in the PR.
8. **Polish + docs.** Empty state (sample cards plus a drop zone), loading skeleton, sonner toasts for errors, and a "boxes and confidence are model-reported" note. Write `README.md`: what it is, sources, run, env, mock vs live, the model id and where it was verified, verified vs claimed, and pricing. Add `vercel.json` + `api/*.ts` (thin Node wrappers over `server/http.ts`, `engines.node: "22.x"`) like the other apps **only if time allows**; it's not required. Append one row to the root README Demos table.
9. **Capture + PR.** `bun run capture` (`scripts/capture.ts`) and one PR (see Validation).

## File layout
```
apps/terra-drawing-to-form/
  bunfig.toml  package.json  vite.config.ts  index.html  README.md  PLAN.md  components.json  .gitignore
  server/
    index.ts      # Bun.serve routes (dev API :8787)
    http.ts       # Request→Response handlers (shared with optional api/*)
    env.ts        # OPENAI_API_KEY presence → mode; TERRA_MODEL; MOCK=1 override
    terra.ts      # ADAPTER: Responses API call, prompt, usage, latency, error mapping
    schema.ts     # zod: ExtractRequest, model output, FieldResult; buildSchema(template)
    bbox.ts       # pixel → normalized box, clamp/order, null handling
    coerce.ts     # string → typed value per template field type
    mock.ts       # replay fixtures/<id>.mock.json with scaled latency
  samples/src/    # bracket-drawing.ts  service-request-form.ts  motor-spec-sheet.ts (SVG builders)
  fixtures/       # <id>.mock.json  <id>.regions.json
  public/samples/ # <id>.png (generated, committed)
  scripts/
    build-samples.ts  # SVG → PNG + regions (resvg)
    record.ts         # optional: re-record mocks from live calls (needs key)
    capture.ts        # Playwright: screenshot + video → media/
  src/
    App.tsx  main.tsx  index.css
    templates/    # drawing.ts  service-form.ts  spec-sheet.ts  index.ts
    viewer/       # ImageViewer.tsx  BoxOverlay.tsx
    form/         # FieldRow.tsx  FormPanel.tsx  ConfidenceBadge.tsx
    upload/       # DropZone.tsx  SamplePicker.tsx
    run/          # RunPanel.tsx
    lib/          # api.ts  image.ts (downscale)  export.ts  pricing.ts  types.ts  confidence.ts
    components/ui/*   # shadcn (generated): button card input select checkbox badge tabs tooltip sonner skeleton
  media/screenshot.png  media/demo.mp4
```

## Stack (one line each)
- **Bun**: repo-standard runtime, package manager, test runner and `Bun.serve` API that keeps the key server-side.
- **Vite + React 19 + TS** (`bunx create-vite --template react-ts`): a one-screen tool, matching the other apps in `apps/`.
- **shadcn/ui (minimalist) + Tailwind v4**: repo standard. Card, Input, Select, Badge and Tooltip cover the UI.
- **`openai` SDK**: the official client for `responses.create` with `text.format` structured output.
- **zod**: validates requests and parses the model's JSON. It can produce the strict JSON schema with `z.toJSONSchema`, but a hand-built schema is fine if strict-mode quirks show up.
- **Plain SVG overlay**: boxes are just `<rect>`s in normalized coordinates, so no canvas or annotation library is needed.
- **`@resvg/resvg-js` (dev only)**: deterministic SVG→PNG for the samples, so the mock boxes are exact.
- **Playwright (dev only) + ffmpeg**: scripted screenshot and video capture, so the validation media is reproducible.

## Env vars
| var | default | notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | (none) | set → live mode; unset → mock mode (default for this build) |
| `TERRA_MODEL` | `gpt-6.1-terra` | verified id; override for a dated snapshot or a fallback model |
| `TERRA_EFFORT` | `medium` | default reasoning effort |
| `MOCK` | (none) | `1` forces mock even when a key is set |
| `MOCK_SPEED` | `1` | divides mock latency (capture uses a faster value) |
| `PORT` | `8787` | dev API port (Vite on 5173 proxies `/api`) |

## Testing (critical logic only, `bun test`, no network, no key)
1. **Fixture honesty**: every mock `bbox` is inside [0,1] and has an IoU of at least 0.5 with the field's region in `fixtures/<id>.regions.json`. Every template key appears exactly once in each mock, and `null` values have `bbox: null`.
2. **`bbox.ts`**: pixel→normalized for known sizes, swapped corners get ordered, out-of-range values get clamped, zero-area boxes become `null`.
3. **`coerce.ts`**: `"1,250 mm"`→1250 for a number (unit kept separately), `"Ø 8.5"`→8.5, `"30/10/2026"` and `"2026-10-30"`→`2026-10-30`, yes/✓→true, and an unparseable value keeps the raw string, adds a note and caps confidence.
4. **`buildSchema`**: strict-mode valid (all properties required, `additionalProperties: false`, key enum = template keys). **The request builder** sends `detail: "original"`, the model from env, `store: false`, and **never** `temperature`/`top_p`/`top_logprobs`.
5. **`buildExport`**: edited fields keep `modelValue`, values are typed, and the shape matches the README.
6. **Handlers**: with no `OPENAI_API_KEY`, `/api/extract` with a sample returns `synthetic: true` and never constructs an OpenAI client. Without `sampleId` it returns `409 live_required`. `/api/mode` never includes the key. Bad bodies get a 400.
- The downscale util and overlay rendering are checked manually and in the video. Git hooks: none.

## Acceptance criteria
- [ ] With **no env vars**, `bun install && bun run dev` starts, the header shows **Mock: bundled samples**, and each of the 3 samples fills its form with boxes and confidence. No network calls go to OpenAI.
- [ ] Every filled field with a box draws a rectangle over the right region. Hover and click link the field and the box both ways, and boxes are coloured by confidence.
- [ ] The form sample shows one **Null** field and at least one low-confidence (red/amber) field. The review-queue sort puts them first.
- [ ] Editing a value shows **edited** and reset restores the model value. Export downloads/copies JSON with typed values, `modelValue`, `edited`, `confidence` and `bbox`.
- [ ] Uploading a PNG/JPEG shows it downscaled to at most 2048 px. In mock mode it shows the live-required message and no invented values.
- [ ] With `OPENAI_API_KEY` set, the header shows **Live** and `/api/extract` calls `responses.create` with `model: gpt-6.1-terra` (or `TERRA_MODEL`). The key never appears in responses, logs or `dist/` (`rg` the build output).
- [ ] The run panel shows latency, tokens and estimated cost at $1/$5 per M with the source link. Mock numbers say "illustrative".
- [ ] `bun test` and `bun run build` pass.
- [ ] The diff touches only `apps/terra-drawing-to-form/**` plus one added row in the root `README.md` Demos table.

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running app, recorded in **mock mode** (no key is available):
  - **Screenshot** `media/screenshot.png`: the bracket drawing with boxes over the title block and dimensions, the filled form beside it, one field hovered (its box highlighted) and the confidence badges visible. Embed it in the PR body.
  - **Video** `media/demo.mp4` (H.264, ideally **under 45 s**, 1280×800). Record it with `bun run capture`: Playwright `recordVideo` → webm → `ffmpeg -c:v libx264 -pix_fmt yuv420p -movflags +faststart`. Commit it and link or attach it in the PR. Script:
    1. Pick the bracket drawing. It loads, then the form fills with boxes.
    2. Hover 3 fields to show their boxes, then click a box to focus its field.
    3. Edit one dimension; **edited** appears.
    4. Switch to the service request form, then sort by lowest confidence to show the Null and red fields.
    5. Open the motor spec sheet, then click Export and show the JSON.
    6. Drop your own image to show the live-required message.
- The PR body says the captures are mock mode (hand-written `synthetic` responses, illustrative timings), names the model id and its source, and gives the one command that makes it live (`OPENAI_API_KEY=… bun run dev`, and optionally `bun run record`).
- Exactly one PR. Only `apps/terra-drawing-to-form/**` plus one README Demos row changed.

## Deferred (and why)
- **Auto-detect fields / custom template builder.** It needs a second schema-less call and UI to promote fields. Fixed templates keep the strict schema and the tests simple.
- **Computer use: fill a real web form from the drawing** (Terra's other headline skill). It needs the computer-use loop, a browser driver and a target app. That's a good follow-up demo.
- **PDF / multi-page input.** It needs rasterization and page navigation. Single image first.
- **Deskew, crop and perspective correction for phone photos.** Terra's own robustness is the point, and the client-side downscale is enough.
- **Side-by-side with GPT-6 Luna / Sol on cost and accuracy.** It's interesting but doubles calls and UI. The run panel already shows cost per extraction.
- **Deployment.** The optional `vercel.json` + `api/*` stays in mock mode, and live deployment would need key management.
