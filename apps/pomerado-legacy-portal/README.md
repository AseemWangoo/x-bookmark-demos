# Pomerado Legacy Portal

A clunky in-memory accounts-payable portal (login, paginated invoices, vendors, a two-step add-vendor form) and a chat UI that calls three MCP tools minted by [Pomerado](https://github.com/Pomerado/pomerado). Each answer shows the `tools/call` arguments, the job trail, the result, and the measured or recorded latency beside an estimated click-through for a browser agent.

Pomerado is an MIT integration minter (`Copyright (c) 2026 Pomerado AI, Inc.`). Minting needs `OPENAI_API_KEY` and models `gpt-6.1-sol` and `gpt-6-luna`. Running a minted integration makes no model request.

This build has **no API key**, so `integrations/` was not created and nothing under it was written by hand. The UI runs in **replay** mode on hand-written fixtures (`synthetic: true`). The badge says **Replay: hand-written, not Pomerado output**.

```bash
OPENAI_API_KEY=… bun run mint && bun run record
```

That is the command that replaces the fixtures with real Pomerado output.

## Sources

- [Pomerado/pomerado](https://github.com/Pomerado/pomerado) (read for this plan at `84d83187`, the commit at the pinned canary) and [npm `pomerado`](https://www.npmjs.com/package/pomerado)
- [pomerado.ai](https://pomerado.ai/) for the company's own benchmark claim, cited in the UI and not remeasured here
- Bookmark: [X trending topic](https://x.com/i/trending/2114600496728092896)

## Pin

`pomerado@0.4.0-canary.390` (exact, published 2026-10-25T04:46:47Z). On 2026-10-28 that was the newest `0.4.0-canary.*` older than 72 hours. `0.4.0-canary.393` and `latest` (`0.4.0-canary.441`) were inside the window and were not installed. There is no stable 0.4.0.

Pomerado's `engines` field is `node >=24.21.0 <25`. This environment has **Node v24.22.1** for child processes (`NODE_BIN`, default `node`). Bun runs the API, the portal, and the tests. Pomerado is spawned with Node, never in-process under Bun. Playwright Chromium for that package is installed with `node node_modules/playwright/cli.js install chromium` (Chrome for Testing 153.0.8010.12).

## Modes

`GET /api/mode` returns `{ mode, reason, pomeradoVersion, node, chromium, minted, synthetic, recordedAt, portalUrl, secondsPerStep }`.

| Mode | When |
| --- | --- |
| `local` | Node `>=24.21 <25`, Playwright Chromium, and `integrations/*/deployment.json` whose `request.url` starts with `PORTAL_URL`. No API key. Latency is labelled measured. |
| `replay` | Anything else, including `VERCEL=1`. Answers come from `fixtures/replay/*.json`. Writes append to an in-memory copy and, off Vercel, are also posted through the bundled portal so Reset matches both. |

`MODE=local` or `MODE=replay` forces the mode. `OPENAI_API_KEY` is read only by `bun run mint`.

## Run

```bash
cd apps/pomerado-legacy-portal
bun install
bun run dev    # portal :4517, API :8787, Vite :5173
```

Portal demo login, printed on `/login`: `clerk` / `legacy123`. `POST /__reset` restores the seed and accepts only loopback clients.

Overdue means stored status Open and due date before `PORTAL_TODAY` (default `2026-10-28`). The seed's overdue set is `INV-1001`, `INV-1004`, `INV-1008`, `INV-1012`, `INV-1019`, `INV-1025`, `INV-1031`.

## Mint

`bun run mint` starts the portal, resets it, and runs `pomerado-mcp mint` for `list_invoices` (read), `list_vendors` (read), and `add_vendor` (write), one job at a time. It answers the login question with the demo credentials and `saveLogin: false`. A confirm that asks to switch a read to write is answered no. Any other question is read from the terminal.

The first URL is `http://127.0.0.1:4517/login`. If that mint fails, the script launches Playwright with `--host-resolver-rules=MAP legacy-portal.test 127.0.0.1` and retries `http://legacy-portal.test:4517/login` via `--endpoint`. **That spike did not run here** because `OPENAI_API_KEY` was unset, so no URL path is verified and there is no `MINT_LOG.json`.

After a published build the script deletes `mcp.mjs`, `mcp.json`, `README.md`, and `.jobs/` (they contain the minting machine's absolute paths) and writes `integrations/MINT_LOG.json`.

`bun run record` refreshes `fixtures/replay` from real local runs. It refuses to run unless mode is `local`.

## Env

| Var | Default | Used by |
| --- | --- | --- |
| `OPENAI_API_KEY` | none | `bun run mint` only |
| `MODE` | auto | force `local` or `replay` |
| `PORTAL_PORT` / `PORTAL_URL` | `4517` / `http://127.0.0.1:4517` | portal; must match minted `deployment.json` |
| `PORTAL_USER` / `PORTAL_PASS` | `clerk` / `legacy123` | portal login and Pomerado's credential answer |
| `PORTAL_TODAY` | `2026-10-28` | overdue calculation |
| `POMERADO_ENDPOINT` | none | Playwright websocket for the `.test` fallback |
| `POMERADO_HEADED` | none | `1` passes `--headed` |
| `SECONDS_PER_STEP` | `8` | browser-agent estimate |
| `NODE_BIN` | `node` | Node 24.21+ binary that spawns Pomerado |

## Vercel

Root directory `apps/pomerado-legacy-portal`. No env vars are required. The deployment is replay-only: functions do not spawn Pomerado or Chromium. With these fixtures the badge stays **Replay: hand-written, not Pomerado output**.

## Verified vs claimed

The UI's speed-up is `steps × SECONDS_PER_STEP` (default 8 seconds), labelled estimate. Replay latencies are the numbers stored in the fixtures, labelled recorded. Pomerado's "8 minutes 16 seconds for 3 cents" vs "21 minutes 22 seconds and $41.01" claim is quoted from [pomerado.ai](https://pomerado.ai/) and is not a measurement from this app.

## Tests

```bash
bun test
bun run build
```

`LIVE_LOCAL=1 bun test tests/live.test.ts` calls the real integrations when they exist.
