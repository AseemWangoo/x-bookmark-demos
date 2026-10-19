# OpenUI Trip Planner — PLAN

Source: [OpenUI 1.0 by Thesys](https://x.com/testingcatalog/status/2110765439798087835) · repo <https://github.com/thesysdev/openui> (MIT) · npm `@openuidev/react-lang@1.0.x`

## Goal
A one-screen chat where typing "plan 2 days in Jaipur" streams back a generative trip-planner UI (itinerary card, day-by-day table, budget chart, "Book" button) rendered from OpenUI Lang through a small custom component library, with a toggle to see the raw OpenUI Lang beside the rendered UI.

## Single-user MVP
In:
- One page: chat input + message list. Each assistant turn renders via `<Renderer>` from `@openuidev/react-lang`.
- Custom 5-component library built with `defineComponent` + `createLibrary` (Zod v4 props, `import { z } from "zod/v4"`):
  - `TripPlan(title, children)` — root layout (shadcn `Card`)
  - `ItineraryCard(city, days, summary, highlights[])` — headline card with badges
  - `DayTable(rows[{day, time, activity, area, cost}])` — shadcn `Table`
  - `BudgetChart(items[{category, amount}], currency)` — shadcn `chart` (Recharts bar or pie)
  - `BookButton(label, action)` — shadcn `Button` using `action()` prop + `useTriggerAction()`
- One custom action `BookTrip({city, days, total})` via `defineAction`; model writes `BookButton("Book this trip", @BookTrip("Jaipur", 2, 18500))`. `onAction` handles `event.type === "BookTrip"` by showing a shadcn `sonner` toast + "Booked (mock)" state. No real booking.
- **Raw markup toggle** (shadcn `Switch`): when on, each assistant message shows a two-column view: left = raw OpenUI Lang (`<pre>`, grows as it streams), right = rendered UI.
- **Mock streaming mode (default, no key needed):** a canned OpenUI Lang fixture per city (Jaipur required; one generic fallback that templates the city name and day count parsed from the prompt) streamed client-side in small chunks (~20–40 chars every ~30 ms) so progressive rendering is visible. `isStreaming` true until done.
- **Real model mode (optional):** if `OPENAI_API_KEY` is set (optional `OPENAI_BASE_URL`, `OPENAI_MODEL`, so any OpenAI-compatible provider such as xAI works), a tiny `/api/chat` endpoint streams the model's text. System prompt is generated with `library.prompt({ preamble, additionalRules, examples: [<Jaipur fixture>] })`. Key never reaches the browser. The UI shows a "Mock" / "Live" badge; a `GET /api/mode` tells the client which mode is active.
- Run: `cd apps/openui-trip-planner && bun install && bun run dev`.

Out (explicitly):
- Auth, persistence/history across reloads, multi-user, real booking or payments, maps, live prices, OpenUI Queries/Mutations/tool calls, `@openuidev/react-ui` prebuilt chat (we want our own small library to show the core API), deployment.

## Tasks (vertical slices, in order)
1. **Scaffold + guardrail.** Create `apps/openui-trip-planner/bunfig.toml` FIRST:
   ```toml
   [install]
   minimumReleaseAge = 259200
   ```
   Then scaffold Vite React TS into that directory without installing (`bunx create-vite@latest . --template react-ts`, answer "no" to install / pass the no-install flag), then `bun install`. Add Tailwind v4 + `bunx shadcn@latest init` (minimalist preset: neutral base, default/new-york style). `bun run dev` shows a blank page.
2. **Mock stream renders a Jaipur plan end to end.** Add `@openuidev/react-lang` + `zod`; define the 5 components + `BookTrip` action in `src/genui/library.tsx`; write `src/genui/fixtures/jaipur.oui.ts`; chat input → mock streamer → `<Renderer response isStreaming library onAction onError>`. Add shadcn components only as needed (`card`, `table`, `button`, `badge`, `chart`, `input`, `switch`, `sonner`, `scroll-area`).
3. **Book action works.** Clicking "Book this trip" fires `BookTrip` → toast + button flips to "Booked ✓ (mock)".
4. **Raw OpenUI Lang toggle.** Switch in header; side-by-side raw/rendered per message, both updating live while streaming.
5. **Optional live model.** Vite dev-server middleware plugin (in `vite.config.ts`, `configureServer`) serving `GET /api/mode` and `POST /api/chat` that uses the `openai` SDK with `stream: true` and pipes text deltas as a plain text stream. Client switches source by mode; same rendering path. Mock remains default when no key.
6. **Polish + docs.** Empty state with 3 suggestion chips ("Plan 2 days in Jaipur", …); `README.md` in the app (what it is, run command, env vars, how the library maps to OpenUI Lang); append one row to the root README **Demos** table.
7. **Validate + PR.** Run the app, capture artifacts, open exactly ONE PR (see Validation).

## Structure
```
apps/openui-trip-planner/
  bunfig.toml  package.json  vite.config.ts  index.html  README.md  PLAN.md
  src/
    main.tsx  App.tsx            # page shell: header (mode badge + raw toggle), chat
    chat/                         # useChat hook, MessageList, Composer
    genui/library.tsx             # defineComponent x5, defineAction BookTrip, createLibrary
    genui/components/*.tsx        # renderers using shadcn primitives
    genui/fixtures/*.ts           # canned OpenUI Lang for mock mode
    stream/mock.ts  stream/live.ts
    components/ui/*               # shadcn (generated)
  server/chat-plugin.ts           # Vite middleware for /api/mode + /api/chat
```

## Stack (one line each)
- **Bun** — repo standard runtime, package manager, script runner.
- **Vite + React 19 + TypeScript (`bunx create-vite --template react-ts`)** — one-screen utility, no routing/SSR needed, so Next.js would be framework weight without payoff; `@openuidev/react-lang` needs React ≥19 which the template ships.
- **Vite dev-server middleware for `/api/chat`** — keeps the optional API key server-side while preserving the single `bun run dev` command; no second process.
- **`@openuidev/react-lang` 1.0.x + `zod` v4** — the core OpenUI runtime: `defineComponent`, `defineAction`, `action()`, `createLibrary`, `library.prompt()`, `<Renderer>`, `useTriggerAction()`; using our own library (not `react-ui`) is the point of the demo.
- **shadcn/ui (minimalist preset) + Tailwind v4** — repo standard; components added on demand.
- **shadcn `chart` (Recharts)** — prebuilt, themed chart wrapper for the budget chart.
- **`openai` SDK** — OpenAI-compatible streaming client for the optional live mode (works with OpenAI, xAI, etc. via base URL).
- **`sonner` (via shadcn)** — toast for the mock booking confirmation.

## Testing / hooks
- Tests: one `bun test` for the critical logic only — the Jaipur fixture parses with `createParser(library.toJSONSchema(), library.root)` with zero `meta.errors` (guards fixture/schema drift). No other tests.
- Git hooks: none (demo app).

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running app:
  - Screenshot: a completed Jaipur plan (itinerary card, day table, budget chart, Book button), ideally with the raw toggle on.
  - Video: screen recording of typing "plan 2 days in Jaipur", the UI streaming in progressively, clicking Book (toast), and flipping the raw OpenUI Lang toggle.
- Mock mode must work with no env vars set.
- Exactly one PR; only `apps/openui-trip-planner/**` plus one README Demos row changed.

## Deferred (and why)
- Live mode tool calls / Queries (real hotel or weather data) — needs external APIs/keys; not on the MVP path.
- Conversation persistence (`buildMessage` / `parseMessage`) — single session is enough to show the idea.
- Follow-up refinement turns ("make day 2 cheaper") via incremental editing — nice, but adds prompt/state work; revisit after slice 2 runs.
- Deployment (Vercel) — local demo first.
- `@openuidev/react-ui` prebuilt chat layout — would hide the custom-library API we want to showcase.
