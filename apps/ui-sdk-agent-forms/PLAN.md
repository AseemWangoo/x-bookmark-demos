# UI SDK Agent Forms: PLAN

Sources (read 2026-11-13):
- [UI SDK](https://ui-sdk.dev/) and [Get Started](https://ui-sdk.dev/docs)
- [Built for Agents](https://ui-sdk.dev/docs/agents) (same content as the `agents.md` that ships in `@ui-sdk/react@0.1.0-beta.1` and `@ui-sdk/core@0.1.0-beta.1`)
- [React introduction](https://ui-sdk.dev/docs/react), plus shipped docs: `installation.md`, `first-component.md`, `forms.md`, `popups.md`
- Component docs (also at `ui-sdk.dev/docs/react/components/…`): [Select](https://ui-sdk.dev/docs/react/components/select), [Combobox](https://ui-sdk.dev/docs/react/components/combobox), [Date Picker](https://ui-sdk.dev/docs/react/components/date-picker), [Calendar](https://ui-sdk.dev/docs/react/components/calendar), [Number Input](https://ui-sdk.dev/docs/react/components/number-input), [Field](https://ui-sdk.dev/docs/react/components/field), [Input](https://ui-sdk.dev/docs/react/components/input), [Popover](https://ui-sdk.dev/docs/react/components/popover), [Button](https://ui-sdk.dev/docs/react/components/button)
- Type and runtime exports from the published tarballs: `@ui-sdk/react/agent` re-exports `createAgent`, `registerTools`, `agentTools` from `@ui-sdk/core/agent`
- [GitHub: vercel-labs/ui](https://github.com/vercel-labs/ui) (Apache-2.0, homepage https://ui-sdk.dev)
- [Launch post](https://x.com/vercel/status/2120950020249895314) (2026-11-12)
- npm registry publish times for `@ui-sdk/*` and the scaffold pin set (age gate = 3 days)

## Goal
A one-screen playground: describe a form (for example "booking form with date picker, guest count and room type") and get a working, keyboard-navigable form built from UI SDK components. A side panel lists the app's WebMCP / agent-bridge tools. A **Let an agent fill it** button runs a scripted agent that completes the form through the official `snapshot` / `query` / `act` tools. Prompt-to-form is deterministic templates by default, clearly labelled, and needs no API key.

## Verified API facts (UI SDK)

### Packages and install
- Official install (docs): `npm install @ui-sdk/react @ui-sdk/core`. In this repo: `bun add @ui-sdk/react@0.1.0-beta.1 @ui-sdk/core@0.1.0-beta.1` after `bunfig.toml` exists. Swap `@ui-sdk/react` for `@ui-sdk/vue`, `@ui-sdk/svelte`, `@ui-sdk/solid`, or `@ui-sdk/web` in other frameworks; this demo is React only.
- `@ui-sdk/react` is the React component adapter. `@ui-sdk/core` holds the behaviors and is a **peer** of the adapter (`@ui-sdk/core: ^0.1.0-beta.1`). Install both so components and helpers share one copy of core.
- React adapter peers (from the published package): `react` and `react-dom` `>=19`, `@types/react` `>=19.2.10`, `@ui-sdk/core` `^0.1.0-beta.1`.
- There is **no root import** from `@ui-sdk/react`. Import each component from its own entry, e.g. `@ui-sdk/react/select`, `@ui-sdk/react/date-picker`.
- Components are unstyled. No provider and no UI SDK stylesheet are required for React. Style with the app's CSS or Tailwind, using the documented `data-slot` / state attributes (`data-open`, `data-pressed`, `data-pending`, and so on).
- Optional official setup (do not block the MVP on it): `npx skills add vercel-labs/ui --skill ui-sdk`, and a note in the app `AGENTS.md` pointing at `node_modules/@ui-sdk/react/docs/llms.txt`.
- UI SDK is a **public beta**. APIs may change. Licence: Apache-2.0.

### Age-gate warning (blocking as of plan write)
`@ui-sdk/core@0.1.0-beta.1` published **2026-11-12T17:12:06Z**. `@ui-sdk/react@0.1.0-beta.1` published **2026-11-12T17:09:05Z**. Those are the only real releases (a same-day `0.0.0-stage` stub has no exports). As of 2026-11-13 they are under the 3-day `minimumReleaseAge = 259200` gate. The gate lifts at **2026-11-15T17:12:06Z** for core (the later of the two). **Pin `0.1.0-beta.1` anyway.** If `bun install` / `bun add` hard-fails the age gate, **stop and report**; do **not** weaken `bunfig.toml`, do not vendor a tarball as a substitute pin, and do not use `0.0.0-stage`. Retry after the gate lifts with the same pins.

### Form primitives to use (React entries and parts)
These are the documented components a booking-style form needs. Use them from `@ui-sdk/react/…`, not by inventing wrappers or a standalone focus-trap package.

| Need | Package entry | Root + parts (minimum) |
| --- | --- | --- |
| Labels, description, errors | `@ui-sdk/react/field` | `Field`, `FieldLabel`, `FieldDescription`, `FieldError` |
| Text | `@ui-sdk/react/input` | `Input` (optional `InputGroup`, `InputClear`) |
| Guest count | `@ui-sdk/react/number-input` | `NumberInput`, `NumberInputGroup`, `NumberInputControl`, `NumberInputDecrement`, `NumberInputIncrement` |
| Room type (closed list) | `@ui-sdk/react/select` | `Select`, `SelectLabel` or a `FieldLabel`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` (optional `SelectItemIndicator`) |
| Searchable choice (optional second template) | `@ui-sdk/react/combobox` | `Combobox`, `ComboboxLabel`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, `ComboboxItem` |
| Date (or range) | `@ui-sdk/react/date-picker` | `DatePicker`, `DatePickerInput`, `DatePickerTrigger`, `DatePickerHint`, `DatePickerContent`, plus calendar parts exported from the same entry: `CalendarHeading`, `CalendarPrevious`, `CalendarNext`, `CalendarGrid`, `CalendarWeekdays`, `CalendarWeekday`, `CalendarWeeks`, `CalendarDay` |
| Submit | `@ui-sdk/react/button` | `Button` |
| Nested popup (not required for the booking template) | `@ui-sdk/react/popover` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription`, `PopoverClose` |

- Date Picker exists. Values are **Gregorian ISO date strings** (or `[start, end]` in range mode, or `null`). `name` submits the ISO date. People can type a locale date or pick from the calendar.
- Number Input keeps a numeric value (`null` when empty). Controller / API methods documented: `setValue()`, `getValue()`, `increment()`, `decrement()`, `focus()`.
- Give controls a `name` so values participate in a native form. Wrap them in `Field` for an accessible name — the agent bridge uses that label in `snapshot` / `act`.
- **There is no standalone `FocusTrap` component or `createFocusTrap` export.** Focus movement, Tab wrapping, and focus return are built into popups. Official popups guide: `modal={true}` or `modal="trap-focus"` makes Tab / Shift+Tab wrap inside the content; `modal={false}` lets Tab leave. Dialogs, drawers, and popovers move focus into content and return it to the trigger on close. Selects, comboboxes, and the date-picker popup use the same `createPopup` behavior in `@ui-sdk/core`. Related core focus helpers, if a custom primitive is ever needed: `createRovingFocus`, `createFocusRecovery`, `keepFocus`. Do not add a third-party focus-trap library.

### Agent bridge and WebMCP (exact API)
Import from **`@ui-sdk/react/agent`** (re-exports `@ui-sdk/core/agent`):

```ts
import { createAgent, registerTools, agentTools } from "@ui-sdk/react/agent"

const agent = createAgent({
  // optional: (step, { signal }) => boolean | Promise<boolean>
  // allow?: Allow
  // timeout?: number // ms, default 5 minutes
})

const unregister = registerTools(agent, {
  allow: (step) => step.action !== "press" || confirm(`Press ${step.args[0]}?`),
})
```

- **Create the bridge in the browser, before (or as) the page renders**, and import that module from `main.tsx` **before** `createRoot(…).render(…)` so it sees components as they mount. Importing the entry alone does not start registration.
- The bridge exposes four methods. The first three are also the WebMCP tools, with the same names, inputs, and outputs:
  1. **`snapshot()`** — synchronous `AgentComponent[]`. Each entry has `ref` (e.g. `"c1"`), `component` (e.g. `"input"`, `"select"`), optional `label`, current state (`value`, `checked`, `open`, plus `min` / `max` / `required` when present), optional `items`, and `actions` (e.g. `["setValue", "clear"]`). Hidden with `data-agent-hidden` are omitted. After 100 entries it ends with `{ ref: "more", component: "more", more, use: "query", actions: [] }`.
  2. **`query({ text?, within?, kind? })`** — finds components or list items without listing the whole page. `within: "Region"` returns that select with up to 50 `{ value, label }` items. Pass at least one of `text`, `within`, `kind`.
  3. **`act({ steps: [{ ref, action, args? }] })`** — runs steps in order through each component's API (not by faking pointer/keyboard events). `ref` may be the snapshot ref, the accessible label, nearby row text, or kind (`"Project name"` and `"project name"` both work). Item arguments may be the value or the label. Returns `{ ok, error?, steps, appeared, values, open? }`. A failed step stops the call; earlier steps stay applied. There is no rollback.
  4. **`subscribe(listener)`** — observed changes, including `source: "agent"`. Returns an unsubscribe function.
- **`agentTools`** is the JSON Schema list of the three tools (`snapshot`, `act`, `query`) as `{ name, description, inputSchema }`. It does not open a model connection or run a tool loop. `snapshot` has an empty input object; `act` requires `{ steps: [{ ref, action, args? }] }`; `query` accepts `{ text?, within?, kind? }`.
- **`registerTools(agent, { allow })`** registers those three tools with **`document.modelContext.registerTool`** (WebMCP). `allow` is **required**. It runs after the bridge's own `allow`. It returns a cleanup function. **In a browser without `document.modelContext.registerTool`, registration is a documented no-op.** Tool annotations: `readOnlyHint: true` on `snapshot` and `query`; `untrustedContentHint: true` on all three.
- Official documented consumer of the WebMCP registration is the **ChatGPT desktop app** built-in browser with site tools enabled, pointed at the Vite origin itself (tools are not discovered inside an iframe). Check support with `typeof document.modelContext?.registerTool` — `"function"` means registration can work; `"undefined"` means console / in-page `agent.*` calls still work, but no browser agent will see the tools.
- Permissions: `createAgent({ allow })` can refuse steps. `data-agent-confirm="…"` requires a person (`allow` must approve; without `allow` the step fails with "Needs a person"). `data-agent-hidden` omits components; `data-agent-secret` redacts values as `"[redacted]"`. Change callbacks receive `details.source === "agent"` and may `details.cancel()`.
- `press` clicks a Button (optional button text as the argument). Do not put a destructive submit behind the scripted fill without `data-agent-confirm`.

### What is and is not available for "an agent fills the form"
- **Available now, no extra package, no API key:** call `agent.snapshot()`, `agent.query()`, and `agent.act()` from the page. This is the official agent bridge. The fill button should use these methods.
- **Available where the browser implements WebMCP:** `registerTools` exposes the same three tools to the browser's agent. Most everyday browsers will no-op. Label the side panel with the live `document.modelContext` check. Do not add `@web-ai-sdk/webmcp` or any unofficial wrapper.
- **Not available for the MVP (and not required):** a live LLM that plans tool calls. The fill button is a **scripted** caller of the real tools, clearly labelled **"Scripted agent — calls this page's snapshot / query / act tools directly. No model, no API key."** Prompt-to-form is also template-based, not a model generating new primitives.

### Open questions (do not invent; isolate behind the adapter)
1. **`bun install` of `@ui-sdk/react@0.1.0-beta.1` and `@ui-sdk/core@0.1.0-beta.1` under `minimumReleaseAge = 259200`.** Expected to fail until 2026-11-15T17:12:06Z. If it fails, stop and report. Do not weaken the gate.
2. **Exact runtime `actions` lists** for Date Picker and Number Input in the snapshot (docs and typings confirm `setValue` on both; Date Picker also has open/month APIs, Number Input also has `increment` / `decrement`). The scripted filler must `snapshot()` (and `query()` for select items) first, then `act` only with actions the snapshot lists. Prefer `setValue` with an ISO date or a number / item value. If a live snapshot disagrees with this plan, record the actual actions in Implementation notes and drive the script from the snapshot.
3. **Bun + Vite ESM interop** with the published `@ui-sdk/*` dual package. Official examples use `npm` and Vite. If `bun install` or `bun run dev` fails on the pins, stop and report; do not switch package managers or weaken `bunfig.toml`.
4. **Whether `registerTools` reports any error** in the capture browser (Chrome/Chromium without WebMCP should be a silent no-op; a thrown `NotAllowedError` is also documented as ignorable). Surface the support check in the UI; do not fake a WebMCP session.

### Age-compliant pins (bunfig minimumReleaseAge = 259200)
Feature pins (intended, currently under the gate — see warning above): **`@ui-sdk/react@0.1.0-beta.1`** and **`@ui-sdk/core@0.1.0-beta.1`**. Scaffold pins matching the Carbon desk and registry ages: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7` (or `7.3.8`, which is age-compliant; or the create-vite default if it resolves age-compliant), `@vitejs/plugin-react@5.2.0`, `typescript@5.8.3` or `5.9.3`, `tailwindcss@4.3.4` or `4.3.5`, `@tailwindcss/vite` at the same Tailwind version, `@types/bun@1.4.4`, `@types/node@24.19.2`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0` or the newest age-compliant `1.71.0`. **`@types/react` must be `>=19.2.10`** (UI SDK peer). Other desks used `19.1.13`, which is too old here — pin **`@types/react@19.3.0`** and **`@types/react-dom@19.3.0`** (published 2026-09-09, age-compliant). Exact pins for `@ui-sdk/*`; caret ranges are fine for ordinary UI deps once install proves age-compliant. If Bun hard-fails the age gate, stop and report; do not weaken `bunfig.toml`.

## Single-user MVP
In:
- **Prompt bar**: textarea seeded with at least **"booking form with date picker, guest count and room type"**, plus one or two other recorded prompts (for example a contact form and a searchable-choice form that uses Combobox). One click maps the prompt to a deterministic template and renders the form.
- **Generated form**, built only from the UI SDK parts above, wrapped in `Field`s, inside a native `<form>`. The canonical booking template: Date Picker (range mode for check-in / check-out if it stays simple; otherwise one stay date), Number Input for guests (`min={1}`), Select for room type (e.g. Standard / Deluxe / Suite), optional name Input, and a UI SDK `Button` to submit. Submit may show an on-page confirmation; it must not hit a paid API. Keyboard: Tab through fields, arrow keys in the select, date grid, and number stepper, Escape to close popups.
- **Side panel**:
  - The three tool definitions from `agentTools` (`snapshot`, `query`, `act`) with names and short descriptions.
  - A live `agent.snapshot()` of the current form (refresh after generate, fill, and user edits).
  - WebMCP status: whether `document.modelContext.registerTool` is a function, and a sentence that registration is a no-op in browsers without it.
  - A log of the scripted fill's tool calls and results.
- **Let an agent fill it**: a scripted sequence that uses the real bridge — `snapshot()`, `query({ within })` for list fields, then `act({ steps })` to set date, guest count, room type (and name if present). Badge it as scripted, no model. Values should be visible on the form when the run finishes.
- **Prompt-to-form** is a labelled template matcher (**"Template mode — recorded form layouts, no model calls"**). Unknown prompts fall back to the booking template or a small explained default; do not pretend a model designed the form. No API key, no live LLM in the MVP.
- **Mode banner** with run instructions: `bun install && bun run dev`. Mention that WebMCP registration is attempted and is a no-op without `document.modelContext`.
- **Run:** `cd apps/ui-sdk-agent-forms && bun install && bun run dev`.
- The cloud agent appends **one row** to the root README Demos table and includes at least one screenshot and one video of the running app in the PR. The video should show: type or pick the booking prompt, get the form, Tab / keyboard through it, open the side panel tools + snapshot, then run the scripted fill and watch the fields complete.

Out: accounts, multi-user, a live LLM generating new primitives or planning tool calls, ChatGPT-desktop verification as a required gate, Vue/Svelte/Solid/Web Component adapters, writing new `definePrimitive` components, deploying, persisting forms, payments.

## Architecture
```
Vite + React + shadcn desk chrome (prompt bar, side panel, badges)
  FormCanvas  ◀── template registry ── PromptBar
  AgentPanel  ◀── agentTools + snapshot() + WebMCP status + fill log
  FillButton  ──▶ adapter/scripted-fill.ts ──▶ agent.snapshot / query / act

src/agent.ts              createAgent + registerTools (imported first from main.tsx)
src/form/
  templates.ts            deterministic prompt → FormSpec (isolated)
  render.tsx              FormSpec → UI SDK Field/DatePicker/NumberInput/Select/…
src/adapter/
  types.ts                FormSpec, FillPlan, ToolCallLog, WebMcpStatus
  scripted-fill.ts        isolated: snapshot → query → act; no invented methods
  webmcp-status.ts        typeof document.modelContext?.registerTool
```
Keep template matching and the fill script behind the adapter files so open questions (runtime `actions`, WebMCP no-op) stay swappable without UI churn. shadcn/ui is only the desk chrome. The generated form must be UI SDK components, not shadcn Select/Calendar stand-ins.

## Stack (one line each)
- **Bun**: repo standard for install, scripts, and tests.
- **Vite + React + TS** (`bunx create-vite`, skip install): one-screen desk, matches the official UI SDK Vite guide.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button (desk chrome only), Textarea, Tabs or Sheet for the side panel, Tooltip, Sonner on demand.
- **`@ui-sdk/react@0.1.0-beta.1` + `@ui-sdk/core@0.1.0-beta.1`**: unstyled form primitives and the agent / WebMCP bridge.
- **zod**: validate FormSpec / fill-plan shapes in tests.

## Tasks (vertical slices)
1. Scaffold the app + `bunfig.toml` **before** install; pin the dependency set including `@ui-sdk/*` and `@types/react@19.3.0`; prove `bun install` and a production build. If the age gate rejects `@ui-sdk/*`, stop and report (do not weaken `bunfig.toml`).
2. Add `src/agent.ts` (`createAgent`, `registerTools` with a required `allow`, Vite HMR dispose). Implement FormSpec, the booking template plus one extra template, and the UI SDK form renderer with Field wrappers and basic Tailwind styles. Unit-test the prompt→template matcher.
3. Build the playground: prompt bar, form canvas, mode/template banner, side panel (`agentTools`, live snapshot, WebMCP status). Prove keyboard navigation on the booking form (Tab, select list, date grid, number step).
4. Implement `adapter/scripted-fill.ts` against the real bridge (snapshot → query → act). Wire **Let an agent fill it**, log every tool call in the panel, and badge it as scripted. Unit-test the fill plan shape (step construction from a recorded snapshot fixture); a jsdom/happy-dom check of `act` is welcome if the packages run there, otherwise keep that path honest and rely on the manual video.
5. Validate the production build and tests; capture a screenshot and a video of the mock/template desk showing the booking form, the tools panel, and the scripted fill completing the fields. Record the WebMCP support check result in Implementation notes.

## Deferred
Live LLM prompt-to-form or live tool-planning, ChatGPT desktop WebMCP walkthrough as a required check, custom `definePrimitive` components, other framework adapters, deployment, saved forms, payments.

## Post notes
Honest framing: built with Vercel / shadcn UI SDK public beta (`@ui-sdk/react` + `@ui-sdk/core`); the form comes from recorded templates; the agent fill is a scripted caller of the official `snapshot` / `query` / `act` tools; WebMCP is registered when the browser supports it and is a no-op otherwise. Tag at most three verified handles (likely `@vercel` and `@shadcn` — confirm the live accounts at post time; do not invent handles). Do not claim a model designed the form or filled it live.
