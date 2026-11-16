# Implementation notes

Verified against `@ui-sdk/react@0.1.0-beta.1` and `@ui-sdk/core@0.1.0-beta.1` after `bun install` with `minimumReleaseAge = 259200`. The age gate accepted both pins.

## WebMCP

In the capture browser (Chromium), `typeof document.modelContext?.registerTool` is `"undefined"`. `registerTools` is a no-op there. The side panel shows that live check. `agent.snapshot()`, `agent.query()`, and `agent.act()` still run in the page.

## Snapshot actions used by the scripted fill

Recorded from a live booking form:

| Component | Label | Actions |
| --- | --- | --- |
| `input` | Guest name | `setValue`, `clear` |
| `date-picker` | Stay | `setOpen`, `setValue`, `clear`, `setMonth`, `previous`, `next` |
| `number-input` | Guests | `setValue`, `increment`, `decrement` |
| `select` | Room type | `setOpen`, `setValue`, `clear`, `setQuery` |
| `button` | Request booking | `press` (`confirm`: Submit this form) |

`query({ within: "Room type" })` returned Standard, Deluxe, and Suite. The scripted fill calls `setValue` only, with `["2026-12-14", "2026-12-18"]` for the range, `2` for guests, and `"deluxe"` after the query lists that value. It does not `press` the submit button.

## Focus

There is no `FocusTrap` export. Select and Combobox take `modal` as `boolean | "pointer"`. `modal={true}` is what traps focus on those lists. `"trap-focus"` is the popover and dialog value, and these lists do not accept it. The date picker popup does not expose `modal`; arrow keys move in its calendar grid and Escape closes it. That behavior was checked in the browser.
