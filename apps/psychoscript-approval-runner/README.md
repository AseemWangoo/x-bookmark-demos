# Psychoscript Approval Runner

One screen. Paste a script, or load the hand-authored sample. Psychoscript runs it with three mock tools. `searchDocs()` returns canned hits. `sendEmail()` and `chargeCard()` are risky: the run suspends, the snapshot bytes are written to disk, and an approval card shows the pending call and the snapshot size. Approve or reject resumes from those bytes, including after a page reload or a server restart.

Source bookmark: [Psychoscript, @opencode](https://x.com/opencode/status/2125702030832349374).

This is a local Psychoscript desk. It is not OpenCode and not `@opencode/codemode`. The sample in `shared/fixtures/sample.js` is a hand-authored fixture, not model output and not an official OpenCode asset. The tools are mocks. Nothing is emailed and nothing is charged.

## Run

```bash
cd apps/psychoscript-approval-runner
bun install
bun run dev
```

Vite is on `http://127.0.0.1:5173` and proxies `/api` to the Bun server on port 8787.

Requires Bun ≥ 1.4. This desk pins `psychoscript@0.2.1` (MIT, Copyright (c) 2026 Anomaly). Snapshots are build-specific: a 0.2.1 snapshot will not resume on another build. `DEMO=1` only adds a banner flag. It does not skip the real suspend.

`bun test` and `bun run build` cover the suspend, the on-disk round-trip on a new `Runtime`, reject via `Host.fail`, and the HTTP reload path.

## What a run does

`POST /api/runs` starts `runtime.program(code).run()` with `searchDocs`, `sendEmail`, and `chargeCard`. A risky call with no stored decision returns a promise that does not settle. The server then `program.suspend()`s, writes `toBytes` to `data/runs/<id>.bin`, and writes the pending call plus the timeline to `data/runs/<id>.json`.

`POST /api/runs/:id/decide` reads those bytes back, builds a new `Runtime.make` with the same globals, and `runtime.resume(fromBytes(bytes)).run()`. The retried call sees the decision for that `call.key`. Approve returns a mock result. Reject throws `Host.fail("Rejected", ...)`. The sample catches that and returns `{ stopped, message }`. A script that does not catch ends as `{ ok: false, error: { kind: "Rejected" } }`.

The page keeps `?run=<id>`. A reload calls `GET /api/runs/:id` and shows the same card. Restarting the server does too: the runtime is not kept in memory.

On `psychoscript@0.2.1` the hand-authored sample's first pause was 6435 bytes in `bun test` and 6433 bytes on the desk. The snapshot header stores active milliseconds, so the length moves by a few bytes. The package README's 5402-byte figure is a different program. The card shows the file length, not a constant.

## Notes

Proved here on Bun 1.4.5: suspend, write the bytes, read them back, `fromBytes`, and `resume` on a new `Runtime.make`. `0.3.0` was inside the 72-hour install gate when this was pinned, and its snapshots are not interchangeable, so this PR stays on 0.2.1. Node `engines` (`>=24`) was not the runtime; Bun was.

Inside the program, a caught `Host.fail` is an `Error` whose `message` is set. The `kind` shows up on the result diagnostic when the error is not caught. The sample reads `error.message`.
