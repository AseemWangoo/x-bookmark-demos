# OpenUI Trip Planner

A one-screen chat that turns “plan 2 days in Jaipur” into a generative trip UI. The model (or the built-in mock) writes [OpenUI Lang](https://www.openui.com/docs/openui-lang/syntax). [`@openuidev/react-lang`](https://www.npmjs.com/package/@openuidev/react-lang) parses that text and renders it with a five-component library: itinerary card, day table, budget chart, and a Book button.

Mock streaming is the default. No API key is required.

## Run

```bash
cd apps/openui-trip-planner
bun install
bun run dev
```

`bun test` checks that the Jaipur fixture still parses against the library schema.

## Modes

`GET /api/mode` returns `{ "mode": "mock" }` or `{ "mode": "live" }`. The header badge follows that.

| Mode | When | What streams |
| --- | --- | --- |
| Mock | `OPENAI_API_KEY` is unset | A canned Jaipur program, or a generic program that fills in the city and day count from the prompt. Chunks are about 28 characters every 30 ms. |
| Live | `OPENAI_API_KEY` is set | `POST /api/chat` calls an OpenAI-compatible chat completion with `stream: true`. The system prompt comes from `library.prompt()`, including the Jaipur fixture as an example. The key stays on the dev server. |

Optional live env vars:

| Variable | Role |
| --- | --- |
| `OPENAI_API_KEY` | Switches the badge to Live and enables `/api/chat`. |
| `OPENAI_BASE_URL` | OpenAI-compatible base URL (xAI and others). |
| `OPENAI_MODEL` | Model name. Defaults to `gpt-4o-mini`. |

## Library → OpenUI Lang

| Component | Call | Renders |
| --- | --- | --- |
| `TripPlan` | `TripPlan(title, children)` | Root card. Children are itinerary, day table, budget chart, book button. |
| `ItineraryCard` | `ItineraryCard(city, days, summary, highlights)` | City, length badge, summary, highlight badges. |
| `DayTable` | `DayTable(rows)` | Table. Each row is `{day, time, activity, area, cost}`. |
| `BudgetChart` | `BudgetChart(items, currency)` | Bar chart. Each item is `{category, amount}`. |
| `BookButton` | `BookButton(label, action)` | Button. The Jaipur program uses `BookButton("Book this trip", @BookTrip("Jaipur", 2, 18500))`. |

`BookTrip` is a `defineAction`. Clicking the button calls `useTriggerAction()`, and `onAction` handles `event.type === "BookTrip"` with a toast and a “Booked ✓ (mock)” label. Nothing is charged.
