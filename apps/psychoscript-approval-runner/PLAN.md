# Psychoscript Approval Runner: PLAN

Sources (read 2026-11-27):

- npm package [`psychoscript`](https://www.npmjs.com/package/psychoscript) (publish times, `license`, `engines`, `exports`, peer/deps; tarballs `psychoscript@0.2.1` and `psychoscript@0.3.0` unpacked and read)
- Packed `0.2.1` `README.md`, `LICENSE` (MIT, Copyright (c) 2026 Anomaly), and public types: `dist/index.d.ts`, `dist/runtime.d.ts`, `dist/host-function.d.ts`, `dist/runtime/execute.d.ts`, `dist/runtime/options.d.ts`, `dist/runtime/contract.d.ts`, `dist/snapshot/snapshot.d.ts`
- [github.com/anomalyco/psychoscript](https://github.com/anomalyco/psychoscript) (default branch `dev`; homepage [psychoscript.com](https://psychoscript.com))
- Launch post: [@opencode](https://x.com/opencode/status/2125702030832349374) (2026-11-25 21:23:52 UTC / 26 Nov 2026, 2:53 AM IST)
- npm registry publish times for `psychoscript` and the shared Vite/shadcn set (age gate = 3 days = 259200s; checked 2026-11-27 ~04:57 UTC / 10:27 AM IST)

## Goal

A one-screen **approval runner** for a pasted (or sample) agent script. **Psychoscript** runs the script in a confined VM with only three mock host tools — `searchDocs()`, `sendEmail()`, `chargeCard()`. A risky tool call **suspends** the run, **serializes the snapshot to bytes on disk**, and shows an approval card (pending call + snapshot size). Approve or reject **resumes from those bytes**, including after a page reload or a server restart. A timeline records each pause and resume. Scripted sample + recorded walkthrough so the screenshot and video are reliable. Mock tools only; no paid APIs.

This is a local Psychoscript desk, not OpenCode and not `@opencode/codemode`. Label the sample script as hand-authored, not model output.

## Verified package facts

### Name, versions, and the 3-day pin

- Official npm name: **`psychoscript`** (unscoped). Repo: `anomalyco/psychoscript`. There is no `@anomalyco/psychoscript` or `@opencode/psychoscript` on npm (404).
- License: **MIT** (package.json and `LICENSE`: "Copyright (c) 2026 Anomaly").
- Engines (0.2.1 and 0.3.0): **`node: ">=24"`**, **`bun: ">=1.4"`**.
- Dependency: `acorn@8.15.0`. Optional peer: `effect@^4.1.0` (`peerDependenciesMeta.effect.optional = true`). The Promise API has no Effect dependency; `psychoscript/effect` is a separate export. This demo uses the Promise API only.
- Published versions (npm `time`, UTC and IST):

  | Version | Published (UTC) | IST | 72h gate at planning time |
  | --- | --- | --- | --- |
  | `0.0.0-stage` | 2026-11-17T21:25:53.549Z | 18 Nov 2026, 2:55 AM | old enough |
  | `0.0.0` | 2026-11-17T21:29:01.932Z | 18 Nov 2026, 2:59 AM | old enough |
  | `0.1.0` | 2026-11-19T22:08:25.717Z | 20 Nov 2026, 3:38 AM | old enough |
  | `0.1.1` | 2026-11-20T00:15:24.795Z | 20 Nov 2026, 5:45 AM | old enough |
  | `0.1.2` | 2026-11-20T00:23:13.293Z | 20 Nov 2026, 5:53 AM | old enough |
  | `0.2.0` | 2026-11-20T15:35:00.627Z | 20 Nov 2026, 9:05 PM | old enough |
  | **`0.2.1`** | **2026-11-20T15:46:28.952Z** | **20 Nov 2026, 9:16 PM** | **newest that qualifies** |
  | `0.3.0` (latest) | 2026-11-24T05:20:45.186Z | 24 Nov 2026, 10:50 AM | **does not qualify yet** — clears at 2026-11-27T05:20:45Z / 27 Nov 2026, 10:50 AM IST |

- **Pin `psychoscript@0.2.1`.** At plan time (27 Nov 2026, ~10:27 AM IST) `0.3.0` was about 24 minutes short of 72 hours. Do not bump to `0.3.0` until that publish date clears `minimumReleaseAge = 259200`. Public `index.d.ts` / `runtime.d.ts` / `host-function.d.ts` of `0.3.0` matched `0.2.1` in a file diff; the 0.3.0 README only adds `StreamingResponse.clone()`, documents `BigInt` and a few more `Symbol.*` keys. Snapshots are **build-specific** (package version + opcode/prelude/codec hash) — never resume a 0.2.1 snapshot in 0.3.0 or the reverse.

### Verified API (quoted from the 0.2.1 README and types)

Do not invent other names. The compile-and-run surface is `Runtime.make`, `runtime.execute`, `runtime.program`, `program.run`, `program.suspend`, `toBytes`, `fromBytes`, and `runtime.resume`. There is no exported function literally named `compile`. `parseProgram(code)` is a public helper that returns `{ ok: true, program, source } | { ok: false, error }` and may be used to lint a script before running it.

```ts
import { Host, Runtime, fromBytes, toBytes } from "psychoscript"

const runtime = Runtime.make({
  limits: { timeoutMs: 1_000, maxOutputBytes: 64_000 },
  globals: (run) => ({
    searchDocs: Host.fn(([q]) => ({ hits: [`doc for ${q}`] })),
    sendEmail: Host.fn(async (args, call) => { /* ... */ }, { type: "async", idempotent: true }),
  }),
})

await runtime.execute(code) // Promise<Result> — runs to the end
const program = runtime.program(code) // nothing runs until program.run()
const running = program.run() // Promise<Outcome>
const outcome = await program.suspend() // or program.suspend({ maxBytes })
// Outcome = Result | Suspended
// Suspended = { ok: "suspended", state: Snapshot }
const bytes = toBytes(outcome.state) // Uint8Array (UTF-8 JSON)
await runtime.resume(fromBytes(bytes)).run()
// Runtime.resume also accepts Suspended["state"] | Uint8Array directly
```

- **`Runtime.make({ globals, limits, modules, translate })`**: `globals` is called for each run **and again on resume**, with the `Run` (`id`, and `metadata` — JSON the host keeps with the run, saved in the snapshot and returned on resume). Throws `RangeError` for invalid limits.
- **`Host.fn(f, options)`**: `f(args, call)` returns a value or a Promise, or throws. `call` has `key` (`<runId>:<callId>`, **the same across resumes**), `signal`, and `suspending()`. `options.type`: `"sync"` (default), `"async"`, or `"sync-thenable"`. **`idempotent: true`** (async only) means a suspend may abort a call in progress and the resumed run will call it again with the same `key`. Without it, `suspend()` rejects with a **`SuspendError`** while the call is in progress, and the run goes on. Also: `constructible`, `takesFunctions`, `snapshot: { encode, decode }`.
- **`Host.durableFn({ start, wait, cancel })`**, **`Host.namespace({ keys, resolve })`**, **`Host.fail(kind, message, suggestions?)`**, **`Host.missing(...)`**: documented; this demo only needs `Host.fn` and `Host.fail` for approve/reject.
- **`program.suspend(options?: { maxBytes })`**: saves state and stops the run; `run()` then resolves with the same `Suspended`. Rejects with `SuspendError` (its `running` lists in-flight calls by `key` and `path`) if a non-suspendable host call is in progress, or if the state can't be saved or is over `maxBytes`. A run that already ended returns its `Result`. Before `run()` starts, this waits for it to start.
- **`toBytes(snapshot)` → `Uint8Array`**; **`fromBytes(bytes: Uint8Array) → unknown`**. Resuming in another build, or from malformed bytes, rejects with a **`SnapshotError`**. A snapshot records the build (package version plus a hash of the opcodes, prelude, codecs and built-ins) and a hash of the host globals.
- **`runtime.resume(state)`** continues a suspended run in a runtime that "must be the same build with the same host globals." This is the documented "resume later, in the same process or another one" path.
- Result shape: `{ ok: true, value }` or `{ ok: false, error: { kind, message, suggestions? } }`, plus `logs`, `warnings`, `metadata`. Values cross as `JSON.stringify` would serialize them.

### Approval flow this demo will use (still the documented API)

Risky tools (`sendEmail`, `chargeCard`) are `Host.fn(..., { type: "async", idempotent: true })`. `searchDocs` may resolve at once (sync is fine).

1. On a risky call whose `call.key` has **no stored decision**: record the pending call (name, args, key) in a side store, return a Promise that does not settle, then `await program.suspend()`. Persist `toBytes(outcome.state)` plus pending-call JSON and the timeline to disk.
2. The desk shows an approval card: tool name, args, **snapshot byte length**, Approve / Reject.
3. On decide (possibly after reload or a new server process): `Runtime.make` again with the same globals; `runtime.resume(fromBytes(bytes)).run()`. The retried host call sees the stored decision for that `call.key` and either returns a mock result or `throw Host.fail("Rejected", "...")`.
4. Repeat if the script hits another risky call. A completed `Result` ends the timeline.

Do not invent a custom "approval API." Decisions live in host-side storage, not inside Psychoscript.

### Limits and caveats (do not invent around them)

- `limits.timeoutMs`: active time summed across resumes; checked between VM steps. Default: none. Use a bound (for example 5_000).
- `limits.maxOutputBytes`: UTF-8 bytes kept from the result and logs. Default: none.
- Fixed caps: string at most 2^24 characters, array at most 10,000,000 elements, at most 10,000 pending promises, values nested at most 32 deep at the host boundary. Exceeding one throws a `RangeError` in the program. No separate memory or step-count limit.
- **No ambient I/O**: no `fetch`, `fs`, `process`, timers, `eval`, `Function`, `with`. No passing program functions to the host (yet). Pathological regex can run long on the host engine.
- **Store snapshots as you would code**: "whoever can edit one controls the resumed run." The server writes and reads its own snapshot files; the MVP does not accept uploaded snapshot bytes from the browser as a trust boundary.
- `call.suspending()` is "whether the run is being suspended" — an interruption then detaches the call instead of ending it. Use the official `program.suspend()` path; do not invent a suspend API around this flag.
- Determinism: `Math.random()`, `Date.now()`, `new Date()`, `crypto.randomUUID` / `getRandomValues` read the host engine and are unseeded. Fixture results should not depend on them, or the host should shadow them.

## Open questions (do not invent; isolate behind the adapter)

- Whether a given Bun 1.4.x / Node 24.x build on the agent's machine has any 0.2.1 quirk vs the documented Promise API. Prove it with the round-trip test; if something fails, quote the error and stay on 0.2.1 (do not silently jump to 0.3.0).
- Exact on-disk snapshot size for the sample script (report it; the official README example printed 5402 bytes for a tiny loop — do not assume our fixture matches).
- `psychoscript@0.3.0` after its 72h gate: API types looked the same, but snapshots will not be interchangeable. Stay on 0.2.1 for this PR.

## Age-compliant pins (bunfig minimumReleaseAge = 259200)

**Feature pin: `psychoscript@0.2.1`.** Do not bump to `0.3.0` until 2026-11-24T05:20:45.186Z is at least 259200 seconds old. Do not add `effect` (optional peer; unused).

Reuse the shared Vite/shadcn set already in tree: `react@19.1.10`, `react-dom@19.1.10`, `vite@7.3.7`, `@vitejs/plugin-react@5.2.0`, `typescript@5.8.3`, `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `@types/bun@1.4.4` (1.4.5 also clears the gate), `@types/node@24.19.2`, `@types/react@19.1.13`, `@types/react-dom@19.1.9`, `zod@4.6.7`, `sonner@2.0.8`, `lucide-react@1.69.0` (1.78.0, published 2026-11-23 06:15:39 UTC, also clears the gate; **1.79.0** from 2026-11-24 06:12:06 UTC and **1.80.0** / **1.81.0** do not yet), `@base-ui/react@1.9.0`, `@fontsource-variable/geist@5.3.0`, `shadcn@4.23.0`, `class-variance-authority@0.7.1`, `cn@0.5.2`, `next-themes@0.4.6`, `tw-animate-css@1.4.0`, `eslint@9.36.0`, `@eslint/js@9.36.0`, `eslint-plugin-react-hooks@5.2.0`, `eslint-plugin-react-refresh@0.4.20`, `globals@16.4.0`, `typescript-eslint@8.44.0`.

Do not add Playwright unless its resolved version already clears the gate — `bun test` unit/API tests are the required suite.

## Single-user MVP

In:

- **Script pane**: a textarea (or simple editor) plus a **Load sample** button. The sample is a short, hand-authored agent script that calls `searchDocs(...)`, then `sendEmail(...)`, then `chargeCard(...)` (plain JavaScript; no TypeScript syntax). Label it as a fixture, not model output and not an official OpenCode asset.
- **Run**: starts `runtime.program(code).run()` on the server with only those three mock host functions. `searchDocs` resolves immediately with canned hits. `sendEmail` and `chargeCard` are risky: they suspend as above.
- **Approval card** when status is suspended: tool name, arguments, `call.key`, **snapshot size in bytes**, Approve and Reject. Reject uses `Host.fail` on resume so the script can catch it or end with `{ ok: false, error }`.
- **Survive reload and server restart**: snapshot bytes + pending decision record + timeline are written under a server-side runs directory (for example `data/runs/<id>.bin` and `data/runs/<id>.json`). On boot, `/api/run/:id` reloads that state. A page reload rediscovers the in-flight approval card.
- **Timeline**: one row per event — started, tool resolved, paused (with byte size), resumed (approved or rejected), finished (result or error). Keep it after restart.
- **Scripted demo path**: Load sample → Run → first approval card appears from a **real** Psychoscript suspend (the library is local; no mock of the VM is required for tests or the video). The walkthrough then Approves, shows the next card, Approves or Rejects, and ends on a result. Optional `DEMO=1` may auto-advance the clicks for capture, but the snapshot on disk must still be real `toBytes` output.
- **Mode banner**: `bun install && bun run dev`, pin `psychoscript@0.2.1`, Bun ≥ 1.4, mock tools only, MIT license one-liner, and "snapshots are build-specific."
- **Run:** `cd apps/psychoscript-approval-runner && bun install && bun run dev`.
- The cloud agent appends **one row** to the root README Demos table and includes at least one screenshot **and** one video of the running desk (load sample, suspend on a risky call, approval card with snapshot size, approve, timeline, and a note that this works after reload). Video must be mp4 **h264 / yuv420p**.

Out: live email/payment APIs, OpenCode / `@opencode/codemode`, the Effect entry (`psychoscript/effect`), uploading untrusted snapshot files, multi-user auth, `0.3.0` until it clears the age gate, official benchmark claims, Playwright e2e unless a gate-clear version is already in tree, deployment.

## Architecture

```
Vite + React + shadcn desk
  ScriptPane + ApprovalCard + Timeline + ResultPane
    ──▶ POST /api/runs          start a program
    ──▶ POST /api/runs/:id/decide  approve | reject
    ──▶ GET  /api/runs/:id       status + timeline (reload-safe)
       ◀── JSON RunView

server/
  tools.ts            searchDocs / sendEmail / chargeCard (Host.fn)
  runtime.ts          Runtime.make; same globals on resume
  store.ts            write/read <id>.bin (toBytes) + <id>.json
  runs.ts             start, suspend, resume, decide
  env.ts              DATA_DIR, timeout, DEMO=1

shared/
  fixtures/sample.js  hand-authored agent script
  types.ts            RunView, TimelineEvent, PendingCall

data/runs/            gitignored snapshot bytes + meta
```

Keep all Psychoscript imports on the server. The browser never loads the VM or writes raw snapshot bytes, except to display the size.

## Stack (one line each)

- **Bun**: repo standard; satisfies `engines.bun >= 1.4`.
- **Vite + React + TS** (`bunx create-vite`, skip install, write `bunfig.toml` before `bun install`): one-screen desk, fast capture.
- **shadcn/ui minimalist + Tailwind**: Card, Badge, Button, ScrollArea, Textarea, Tooltip, Sonner on demand.
- **`psychoscript@0.2.1`** (server-only): `Runtime.make`, `Host.fn`, `program.suspend`, `toBytes` / `fromBytes`, `runtime.resume`.
- **zod**: request/response validation.

## Tasks (vertical slices)

1. Scaffold with `bunx create-vite` (skip install), write `bunfig.toml` with `minimumReleaseAge = 259200` **before** any install, pin the dependency set (including `psychoscript@0.2.1`), prove `bun install` and `bun run build`.
2. Implement the three mock tools, the suspend-on-risky-call loop, disk snapshot store, and tests that must pass with the real package: (a) `searchDocs` completes without a snapshot; (b) a risky call yields `Suspended` and `toBytes` length > 0; (c) **round-trip across a restart** — `toBytes`, write to a temp dir, construct a **new** `Runtime.make()`, `fromBytes` + `resume`, decide approve, and assert the script continues and returns the expected value; (d) reject path throws / `{ ok: false }` via `Host.fail`; (e) `SuspendError` if a non-idempotent in-flight call is suspended (optional but useful); (f) malformed bytes reject with `SnapshotError`.
3. Build the script pane, sample loader, approval card (name, args, byte size), timeline, result pane, and reload-safe `GET /api/runs/:id`.
4. Wire approve/reject to `runtime.resume` after a simulated server restart in an API test (new process or at least a new `Runtime` + fresh read of the bytes on disk). Document live setup and any leftover open questions honestly in the README.
5. Validate `bun test` and `bun run build`; capture a screenshot and a video (mp4 h264/yuv420p) of the scripted walkthrough: load sample, run, approval card with snapshot size, approve, timeline, finished result. Optionally show a reload that restores the card. Do not download any model weights.

## Build constraints (cloud agent)

- Touch **only** `apps/psychoscript-approval-runner/` plus **one** new row in the root README Demos table. Do not edit other apps, skills, or tracker files. Never create a new repo.
- Open **one PR** against `https://github.com/AseemWangoo/x-bookmark-demos` (this repo). The PR body must include at least **one screenshot AND one video** (mp4 h264/yuv420p) of the running app exercising the real flow (sample script, suspend, approval card with snapshot size, approve/reject, timeline). A scripted walkthrough is fine; the suspend/resume must still use real Psychoscript snapshots.
- `bun install`, `bun test`, and `bun run build` must pass cleanly. Do not weaken `bunfig.toml` `minimumReleaseAge = 259200`. Do not bump `psychoscript` past 0.2.1 until 0.3.0's publish date clears the 3-day gate. Do not bump `lucide-react` to 1.79.0 or later until those publish dates clear the gate.
- Honest labelling of the hand-authored sample script. Mock tools only.

## Deferred

`psychoscript@0.3.0` until it clears the age gate, `psychoscript/effect`, `@opencode/codemode` / OpenCode integration, the in-progress Rust implementation mentioned in the launch post, real email or payment APIs, untrusted snapshot upload, multi-user auth, Playwright e2e unless a gate-clear version is already in tree, deployment.

## Post notes

Honest framing: an approval runner on **Psychoscript** (OpenCode's confined, resumable JS interpreter, MIT, npm `psychoscript@0.2.1`); a risky mock tool call suspends the VM, snapshot bytes are saved, and approve/reject resumes from those bytes, including after a restart. Tag at most three verified handles: `@opencode` (id 1965545045089792000, business), `@thdxr` (id 2870102861, blue), `@anomalyco` (id 18323344, business) — reconfirm at post time. Do not tag unverified `@Anomaly` (id 19411556). Do not claim the sample script was model-generated, and do not imply live email or card charges.
