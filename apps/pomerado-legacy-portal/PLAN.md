# Pomerado Legacy Portal: PLAN

Sources (all read 2026-10-28):
- [Pomerado/pomerado on GitHub](https://github.com/Pomerado/pomerado) (MIT, "YC F26"; read at commit `eefcb7c`, 2026-10-27): [README](https://github.com/Pomerado/pomerado/blob/main/README.md), [docs/getting-started.md](https://github.com/Pomerado/pomerado/blob/main/docs/getting-started.md), [docs/how-it-works.md](https://github.com/Pomerado/pomerado/blob/main/docs/how-it-works.md), [LICENSE](https://github.com/Pomerado/pomerado/blob/main/LICENSE)
- Pomerado source used to confirm the CLI and MCP shapes: `typescript/src/standalone/cli.ts`, `mcp-cli.ts`, `mcp-server.ts`, `artifact-files.ts`, `contracts.ts`, `inputs/terminal.ts`, `models/models.ts`
- [npm: pomerado](https://www.npmjs.com/package/pomerado): `npm view pomerado` (dist-tags, `engines`, publish times)
- [pomerado.ai](https://pomerado.ai/) (benchmark claims) · [docs.pomerado.ai](https://docs.pomerado.ai) (Cloud and hosted MCP; not used here)
- [Launch YC: Pomerado](https://www.ycombinator.com/launches/WSd-pomerado-the-faster-cheaper-and-more-reliable-alternative-to-browser-use) · [YC company page](https://www.ycombinator.com/companies/pomerado)
- Bookmark: [X trending topic](https://x.com/i/trending/2114600496728092896). x.com returns 403 to the fetcher, so the trending page itself wasn't read.

## What Pomerado is (verified from the repo, npm and its site)
- An open-source (MIT, `Copyright (c) 2026 Pomerado AI, Inc.`) **integration minter**. Given a URL and a plain-English task ("intent"), a model agent explores the site in a real Chromium (native Playwright), writes operation modules under `src/`, tests them live, and **Guardian** (a second model) reviews each browser action and the finished source. The result is a folder of deterministic code that runs **with no model call**.
- Versions 0.1.2 and earlier were AGPL-3.0-only. Everything after is MIT.
- Requirements (README + getting-started):
  - **macOS or Linux.**
  - **Node `>=24.21.0 <25`** (`engines` in `package.json`). Not "Node 24+": Node 25 is out of range.
  - **`OPENAI_API_KEY` only for minting.** The account must be able to use `gpt-6.1-sol` and `gpt-6-luna` (the minter and Guardian models in `typescript/src/models/models.ts`). **Running a minted integration makes no model request and needs no key.**
  - Playwright Chromium, which is needed to mint **and to run** (an integration drives a browser on every call). Install it with `npx -y -p pomerado playwright install chromium` (add `--with-deps` on Linux if system libraries are missing).
- npm package `pomerado`, bins `pomerado` and `pomerado-mcp`. **There is no stable 0.4.0 on npm.** The `latest` dist-tag points at a canary (`0.4.0-canary.441`, published 2026-10-27), and the newest non-canary is `0.2.0` (2026-10-06). Dependencies include `playwright 1.63.0`, `openai`, `effect` and `@modelcontextprotocol/server 2.3.1`.
- Two CLIs (exact usage strings from the source):
  ```
  pomerado mint --url URL --intent TEXT --out DIRECTORY [--input JSON]
  pomerado run --artifact DIRECTORY --url URL [--input JSON]
    --endpoint URL  --headed  --effect read|write|ask (default ask)  --timeout-seconds N (default 1200)

  pomerado-mcp mint [--root DIRECTORY]       # MCP stdio server with tools mint/get_job/provide_input/cancel_job
  pomerado-mcp serve --artifact DIRECTORY    # serves ONE minted integration as an MCP stdio server
    --endpoint URL  --headed
  ```
  The docs say terminal `pomerado mint` "keeps its original source-artifact format. Use `pomerado-mcp mint` for generated MCP packaging." **This app uses `pomerado-mcp` for both minting and serving.**
- Minting over MCP (`pomerado-mcp mint --root <abs dir>`):
  - `mint` input: `{ name, url, intent, effect: "read" | "write", input?: {...example}, authenticationOrigins?: [https origins] }`. It returns `{ job_id, status: "running", next: { tool: "get_job", ... } }` at once.
  - `get_job { job_id, wait_seconds? }` waits up to 30 s. When done it returns `{ status: "completed", output: { build: "published", integration: { directory, configPath, launcherPath } } }`. `build: "incomplete"` comes with a `summary`, saves nothing, and removes the folder.
  - `status: "input_required"` carries `pending_input: { id, questions: [{ id, type, prompt, ... }] }`. Answer it with `provide_input { job_id, request_id, answers: { [questionId]: answer } }`. A login question (`type: "credential"`, `fields: "username_password"`) takes `{ username, password, saveLogin: false }`. Questions expire after 10 minutes.
  - One job at a time per server ("The server is busy" otherwise). Each mint gets 20 minutes of active work. Names match `^[a-z][a-z0-9_]{0,63}$`, and the folder must not already exist.
  - A **write** mint performs the action once while it builds. A read mint that discovers the task needs a change asks to switch to write.
- Minted integration folder: `src/` (generated operation modules), `pomerado.json` (entrypoint, input/output schemas, questions), `deployment.json` (`{ name, description, request: { url, intent, effect, authenticationOrigins? } }`), `auth-fill.json` (value-free sign-in recipe), plus `mcp.mjs`, `mcp.json` and `README.md`, which hold **absolute paths of the machine that minted it**. `pomerado-mcp serve --artifact` reads only `deployment.json`, `pomerado.json` and the source.
- Serving an integration (`pomerado-mcp serve --artifact <dir>`):
  - **One tool named after the integration**, with its arguments under `input`. A write also takes `idempotency_key` (`^[A-Za-z0-9_-]{1,200}$`), and the docs say to send one with every write. `get_job`, `provide_input` and `cancel_job` are there too.
  - The tool result is `content: [{ type: "text", text: JSON }]` plus `structuredContent`, matching the output schema in `pomerado.json`, **or** a job ID when it needs input or more time. A call returns within about 20 s.
  - A failed call returns a job with `code`, `write_status`, `possible_commit` and `retry`. Read the site back before calling again when `possible_commit` is true.
  - An integration whose build signed in **signs in on every call. It asks for the login each time (`input_required`) and saves nothing.**
  - The run opens the URL in `deployment.json`, so the portal URL (host and port) must be the same at mint and run time.
- URLs: a run/mint page URL may be `http:` or `https:` (`PageUrl` in `contracts.ts`). Extra sign-in origins must be `https:`. The site identity for `localhost` or an IP is "only its own host". No doc or test shows a mint against plain `http://127.0.0.1`. Pomerado's own browser tests serve fixture sites under `.test` hostnames mapped to `127.0.0.1` with Chromium `--host-resolver-rules`, attached through `--endpoint`.
- Pomerado Cloud (hosted MCP at `https://mcp.pomerado.ai/mcp`, a keyless public-tools URL, OAuth, saved logins, self-healing) **isn't used**. The demo is local-only and needs no Pomerado account.

### Benchmark claim (Pomerado's own; present it as such)
pomerado.ai: "Asked to onboard 2 new employees across HR, IT, courses, and library systems, Pomerado finished in **8 minutes 16 seconds for 3 cents**. Codex Computer Use took **21 minutes 22 seconds and cost $41.01**." The site and the YC launch post also claim "2-4x faster, 10-1000x cheaper, +30% more reliable" than browser use (30 tasks in 25 business apps, one try each). None of this is independently verified. The UI shows it only as a cited footnote, never as our measurement.

### Corrections to the brief
- **Node is `>=24.21.0 <25`**, not "Node 24+". The tool is macOS/Linux only.
- **`OPENAI_API_KEY` is needed only to mint**, and the account needs `gpt-6.1-sol` and `gpt-6-luna` access. Running the checked-in integrations needs **no key**, only Node 24.21+ and Chromium. So the keyless mode can be **real Pomerado runs** against the bundled portal, not just a replay. A pure replay mode is still needed for Vercel and for machines without Chromium.
- **Each minted integration is its own MCP server with exactly one tool.** "List invoices", "list vendors" and "add vendor" are three mints and three `serve` processes, not one server with three tools.
- **npm has no stable 0.4.x.** `latest` is a canary. With this repo's `minimumReleaseAge = 259200` (72 h), the newest installable version on 2026-10-28 is about `0.4.0-canary.390` (published 2026-10-25 04:46 UTC).
- **The benchmark is "onboard 2 new employees across 4 systems"**, at 8 min 16 s / $0.03 vs 21 min 22 s / $41.01. That is close to the brief's "8 min and $0.03 vs 21 min and $41", but it is one company-run demo, not one onboarding task in a neutral benchmark.
- **Launch date.** The YC launch post read "2 days ago" on 2026-10-28, which is about Oct 26. The repo has been public since 2026-10-05 and npm 0.1.0 shipped the same day. Oct 25 could not be confirmed or ruled out. "YC F26" and MIT are confirmed.

### Not verified (design around it)
- **Minting against `http://127.0.0.1:4517`.** Do this spike first (task 2). Fallback: serve the portal as `http://legacy-portal.test:4517` and run `pomerado-mcp ... --endpoint <ws>` against a Playwright browser server launched with `--host-resolver-rules=MAP legacy-portal.test 127.0.0.1` (Pomerado's own test pattern). Record which path worked in the README.
- **Whether a build agent has an `OPENAI_API_KEY` with `gpt-6.1-sol` access.** Without one, nothing can be minted. See "No key at build time" below.
- **MCP client compatibility.** Pomerado serves with `@modelcontextprotocol/server` v2. The plan uses `@modelcontextprotocol/sdk` (`Client` + `StdioClientTransport`). If the handshake fails, switch to `@modelcontextprotocol/client` (the v2 split package).
- **Run latency.** "Returns within 20 s" is the only documented bound. Cold start (spawn plus Chromium launch plus sign-in) vs warm is measured by the app and shown separately.
- **Exact output shapes.** They come from each integration's `pomerado.json` after minting. The UI renders any array-of-objects as a table and anything else as JSON.

## Goal
Bundle a deliberately clunky mock "legacy portal" (login, invoices, vendors, add-vendor form). Use Pomerado to mint it into three MCP tools. A small chat UI asks things like "list overdue invoices" or "add a new vendor". Each answer shows the exact MCP tool call, its result and its measured latency, side by side with a transparent estimate for a browser agent clicking through the same task.

## Single-user MVP
In:
- **Legacy portal** (`portal/`, Bun.serve on `127.0.0.1:4517`, server-rendered HTML, no client JS framework). It is deliberately clunky:
  - **`/login`**: username/password form with a `PORTALSESSID` cookie session. Demo credentials are `clerk` / `legacy123`, printed on the login page as "demo credentials". Every other page redirects to `/login` when signed out.
  - **`/app/main.asp`**: frame-like layout with a table-based nav (Invoices, Vendors, Add Vendor, Log off) and a 1999-style grey theme.
  - **`/app/invoices.asp?status=&page=`**:
    - 34 seeded invoices, 10 per page with "Next >>" links
    - a status `<select>` (All, Open, Paid, OVERDUE) that needs a separate **Go** button
    - columns: Invoice #, Vendor, PO, Amount, Due, Status
    - OVERDUE is computed as open with due date before `PORTAL_TODAY` (default `2026-10-28`), so results are deterministic
  - **`/app/vendors.asp`**: 12 seeded vendors with ID, Name, Email, Category and Terms.
  - **`/app/vendor_new.asp`**:
    - required name and email
    - a category `<select>`, a terms radio group (Net 15/30/60), and an "I certify this vendor is approved" checkbox
    - submitting goes to an **interstitial "Confirm vendor creation"** page (a second submit), then to a "Vendor V-1013 created" page
    - server-side validation errors are shown in red at the top
  - **`POST /__reset`** restores the seed. It is test/demo-only, not linked from the portal UI, and allowed only from `127.0.0.1`.
  - State is in memory, seeded from `portal/seed.ts`.
- **Three Pomerado integrations**, minted once by `bun run mint` and committed under `integrations/`:
  | name | effect | intent (plain English, sent to `mint`) | example `input` |
  | --- | --- | --- | --- |
  | `list_invoices` | read | "Sign in and list invoices, optionally filtered by status (open, paid, overdue or all) and vendor name, returning every matching row across all pages with invoice number, vendor, PO, amount, due date and status." | `{ "status": "overdue" }` |
  | `list_vendors` | read | "Sign in and list all vendors with ID, name, email, category and payment terms." | `{}` |
  | `add_vendor` | write | "Sign in and create a new vendor with the given name, email, category and payment terms, confirming the creation, and return the new vendor ID." | `{ "name": "Globex Supply", "email": "ap@globex.example", "category": "Hardware", "terms": "Net 30" }` |
- **Chat UI** (one screen):
  - a message list and composer, plus example chips: "list overdue invoices", "show open invoices from Acme", "list vendors", "add a new vendor Globex Supply, ap@globex.example, Hardware, Net 30"
  - Each assistant answer is a card:
    - **Tool call**: integration name, the exact `tools/call` arguments JSON (`{ input, idempotency_key? }`), the job trail (e.g. `input_required: login → answered with portal demo credentials → completed`), and the result as a shadcn `Table` (arrays of objects) or JSON.
    - **Latency**: measured on the server around the whole MCP exchange, split into cold (process spawn and first call) and warm. Model cost shows "$0 (runs make no model request)".
    - **Side by side**, a **Browser-agent estimate** card: the click-through step list for that task (sign in 3 steps, open Invoices, pick status, click Go, read and page N times...), `steps × SECONDS_PER_STEP` (default 8 s, an assumption labelled "estimate"), and a speed-up ratio. A footnote cites Pomerado's own benchmark claim with a link.
- **Intent router** (`server/router.ts`, rule-based, no model):
  - It maps text to `{ integration, input }`: status words, a vendor name after "from", and comma-separated add-vendor fields.
  - **Writes never run straight from text.** `add_vendor` shows a prefilled confirm form (shadcn `Card` + inputs). Only **Run add_vendor** sends the call, with a fresh `idempotency_key`.
  - Unknown text gets a help reply listing what it can do.
- **Modes**, shown as a header badge (`GET /api/mode` returns `{ mode, reason, pomeradoVersion, node, chromium, minted }`):
  - **`local`** (the default when possible): real `pomerado-mcp serve` runs of the committed integrations against the bundled portal. **No key needed.** It needs Node `>=24.21 <25` on `PATH` (checked with `node --version`), Playwright Chromium installed, and `integrations/*/deployment.json` present with its `request.url` equal to `PORTAL_URL`. Latency is labelled "measured".
  - **`replay`**: no browser and no Node 24. Each answer replays `fixtures/replay/*.json`, which were recorded from real local runs by `bun run record`, with their recorded latency and date. Writes append to an in-memory copy. This is the mode on Vercel and on any machine that fails a `local` check, and the badge says why (e.g. "Replay: Node 20 found, need 24.21+"). If the integrations were never minted, the fixtures are hand-written, `synthetic: true`, and the badge says **"Replay: hand-written, not Pomerado output"**.
  - `MODE=replay|local` forces a mode.
  - **Minting** isn't a runtime mode. It's `bun run mint`, the only place `OPENAI_API_KEY` is read.
- **Portal panel**: an "Open portal" link (local only) and a **Reset portal data** button (`POST /api/reset` proxies to `/__reset`), so a recorded video can add a vendor, list it, and reset.

Out (deferred, see the end): LLM-based routing, multi-step agent plans, minting from the UI, Pomerado Cloud, running live on Vercel.

## Architecture
```
browser (Vite/React chat)  --/api-->  Bun API server :8787 ----spawn (node >=24.21)----> pomerado-mcp serve --artifact integrations/list_invoices
                                         |  router.ts                                   pomerado-mcp serve --artifact integrations/list_vendors
                                         |  pomerado-client.ts (MCP stdio clients,      pomerado-mcp serve --artifact integrations/add_vendor
                                         |   one per integration, kept warm)                         |  Playwright Chromium (headless)
                                         |  replay.ts (fixtures)                                     v
                                         +-------------------------------------------->  legacy portal  Bun.serve :4517 (portal/)
scripts/mint.ts --(MCP stdio)--> pomerado-mcp mint --root <abs>/integrations   [OPENAI_API_KEY, one-off]
```
- `server/pomerado-client.ts` is the single adapter around Pomerado. It spawns `node node_modules/pomerado/dist/typescript/src/standalone/mcp-cli.js serve --artifact <abs dir>`. It resolves the bin from `node_modules/.bin/pomerado-mcp` rather than hard-coding the dist path when possible, and **always runs under `node`, never Bun** (engines). It passes `--endpoint` when `POMERADO_ENDPOINT` is set.
- `callTool(name, args)`:
  - When the result is a job (has `job_id`), it loops: `get_job` (wait 30 s) until `completed`, `failed` or `input_required`.
  - On a `credential` question it answers `provide_input` with `{ username: PORTAL_USER, password: PORTAL_PASS, saveLogin: false }`. Any other question becomes an error that surfaces in the UI ("Pomerado asked: …"). No silent answers beyond the login.
  - It returns `{ output, trail[], ms, cold }`.
  - It never retries a write. On `possible_commit: true` the card says "may have been created; list vendors to check".
- The whole "turn the portal into MCP tools" step lives in one script: `scripts/mint.ts`.
  - It starts the portal, resets it, spawns `pomerado-mcp mint --root <abs>/integrations`, and runs the three `mint` calls in sequence (one job at a time).
  - It polls `get_job` and auto-answers the login question with the demo credentials. Any other question is printed and answered from the terminal (`readline`). It never answers "switch to write" for the read tools: it answers no and logs it.
  - Then it resets the portal (the `add_vendor` mint really creates one vendor), deletes `mcp.mjs`, `mcp.json`, `README.md` and `.jobs/` (absolute paths of the minting machine), and writes `integrations/MINT_LOG.json` (pomerado version, Node version, date, wall-clock minutes per mint, build status, summary).
- `scripts/record.ts` (needs `local` mode): resets the portal, runs every example chip through the real integrations 3×, keeps the median latency (cold and warm), and writes `fixtures/replay/*.json` with `{ recordedAt, pomeradoVersion, synthetic: false }`.

## Tasks (vertical slices)
1. **Scaffold.**
   - `bunfig.toml` with `[install] minimumReleaseAge = 259200` **before any install**.
   - `bunx create-vite@latest apps/pomerado-legacy-portal --template react-ts` (skip install), then `bun install`, `bunx shadcn@latest init` (minimalist preset). Add only `button card input table badge select tabs` as needed.
   - `bun add pomerado@<exact>`: pin an **exact** version and no range. Use the newest `0.4.0-canary.*` that is older than 72 h when you build (≈ `0.4.0-canary.390` or later). Fall back to `0.2.0` if the canary install or `serve` fails, and record the version in README and `MINT_LOG.json`.
   - `bun add @modelcontextprotocol/sdk zod`.
2. **Portal + mint spike.**
   - Build `portal/` with the seed and tests.
   - Then, if a key is available, mint `list_vendors` against `http://127.0.0.1:4517/login`. If it fails on the URL, switch to the `.test` + `--endpoint` fallback.
3. **Mint all three** with `bun run mint` and commit `integrations/` (cleaned) plus `MINT_LOG.json`.
4. **Pomerado client + local mode.**
   - `pomerado-client.ts`, mode detection, `/api/mode`, `/api/ask` (route plus call), `/api/call` (a confirmed write), `/api/reset`.
   - Warm process pool: spawn lazily, keep alive, kill on exit.
5. **Chat UI.** Message list, chips, tool-call card, estimate card, write confirm form, mode badge, reset button.
6. **Record + replay.** Run `bun run record`, add `server/replay.ts`, and get the Vercel build working in replay mode.
7. **Docs, media, PR.**
   - README (what it is, sources, modes, run, mint, env, Vercel, verified vs claimed, which URL path worked).
   - One Demos row, a screenshot and `media/demo.mp4`, then one PR.

### No key at build time
If the build agent has no `OPENAI_API_KEY` with `gpt-6.1-sol` access, still ship everything except the minted folders:
- `scripts/mint.ts` complete and unit-tested against a fake MCP server
- hand-written replay fixtures marked `synthetic: true`
- a badge saying "Replay: hand-written, not Pomerado output"

State this clearly in the PR body, with the one command (`OPENAI_API_KEY=… bun run mint && bun run record`) that turns it into the real demo. **Never hand-write files under `integrations/` or pass them off as Pomerado output.**

## File layout
```
apps/pomerado-legacy-portal/
  bunfig.toml  package.json  vite.config.ts  vercel.json  index.html  README.md  PLAN.md  .gitignore
  portal/
    server.ts        # Bun.serve :4517, routes, cookie session, /__reset
    views.ts         # clunky HTML templates (tables, inline styles)
    data.ts          # in-memory store: invoices, vendors, overdue calc, add/validate
    seed.ts          # 34 invoices, 12 vendors, PORTAL_TODAY default
  integrations/      # COMMITTED Pomerado output (cleaned): list_invoices/ list_vendors/ add_vendor/ + MINT_LOG.json
  server/
    index.ts         # Bun.serve :8787 (local dev API); also starts the portal unless PORTAL_EXTERNAL=1
    http.ts          # shared Request→Response handlers (Bun + Vercel functions)
    env.ts           # env + mode detection (node version, chromium, minted, VERCEL)
    pomerado-client.ts  # ADAPTER: spawn serve, MCP client, job loop, login answer, timing
    router.ts        # text → { integration, input } | help | needs-confirm
    replay.ts        # fixture-backed fake of callTool with the same return shape
    schema.ts        # zod: ask/call bodies, CallResult, replay fixture shape
  api/
    mode.ts  ask.ts  call.ts  reset.ts   # Vercel Node functions → server/http.ts (replay only)
  scripts/
    dev.ts           # (optional) if bun --parallel isn't enough
    mint.ts          # one-off minting via pomerado-mcp mint (needs OPENAI_API_KEY)
    record.ts        # record replay fixtures from real local runs
  fixtures/replay/   # list_invoices.*.json, list_vendors.json, add_vendor.json
  src/
    App.tsx  main.tsx
    chat/            # MessageList, Composer, ExampleChips, AnswerCard, ToolCallPanel, ConfirmWrite
    estimate/        # EstimatePanel
    lib/             # api.ts, estimate.ts (step catalog + formula), types.ts
    components/ui/*  # shadcn (generated)
  tests/  (or colocated *.test.ts)
  media/screenshot.png  media/demo.mp4
```
`.gitignore`: `node_modules`, `dist`, `integrations/**/.jobs`, `integrations/**/mcp.mjs`, `integrations/**/mcp.json`.

## Stack (one line each)
- **Bun**: the repo-standard runtime, package manager and test runner. It runs the API, the portal and the scripts.
- **Node `>=24.21 <25` (child processes only)**: Pomerado's `engines`. Bun spawns it, and it never runs Pomerado in-process.
- **`pomerado` (exact canary pin)**: the subject. `pomerado-mcp mint` builds and `pomerado-mcp serve` runs.
- **`@modelcontextprotocol/sdk`**: the standard MCP stdio client, the boring default. Fall back to `@modelcontextprotocol/client`.
- **Vite + React 19 + TS** (`bunx create-vite --template react-ts`): a one-screen app, same as the other demos.
- **shadcn/ui (minimalist) + Tailwind v4**: repo standard. Card, Table, Badge and Input cover the UI.
- **zod**: request and fixture validation.
- **Plain HTML strings for the portal**: clunky on purpose, and no framework is the point.

## Run / test commands
```bash
cd apps/pomerado-legacy-portal
bun install
npx -y -p pomerado@<pinned> playwright install chromium   # or: bunx playwright install chromium (same playwright as pomerado's dep)
bun run dev            # portal :4517 + API :8787 + Vite :5173 (proxy /api)
bun run portal         # portal only
OPENAI_API_KEY=... bun run mint     # one-off: (re)mint integrations/ (deletes and rebuilds the three folders)
bun run record         # refresh fixtures/replay from real local runs
bun test               # unit tests (no browser, no key)
LIVE_LOCAL=1 bun test tests/live.test.ts   # optional: real integrations against the portal
bun run build          # tsc -b && vite build → dist/
```
Scripts: `dev` (`bun run --parallel dev:portal dev:api dev:web`), `dev:portal` (`bun portal/server.ts`), `dev:api` (`bun --watch server/index.ts`), `dev:web`, `mint`, `record`, `build`, `test`, `lint` (oxlint).

## Env vars
| var | default | used by |
| --- | --- | --- |
| `OPENAI_API_KEY` | (none) | **`bun run mint` only.** It is passed to the `pomerado-mcp mint` child's env and never read by the app server. |
| `MODE` | auto | force `local` or `replay` |
| `PORTAL_PORT` / `PORTAL_URL` | `4517` / `http://127.0.0.1:4517` | portal; must match the integrations' `deployment.json` |
| `PORTAL_USER` / `PORTAL_PASS` | `clerk` / `legacy123` | portal login, and the login answer to Pomerado's credential question |
| `PORTAL_TODAY` | `2026-10-28` | overdue calculation (keeps results deterministic) |
| `POMERADO_ENDPOINT` | (none) | optional Playwright ws endpoint (`--endpoint`) for the `.test` fallback |
| `POMERADO_HEADED` | (none) | `1` adds `--headed` (useful when recording the video) |
| `SECONDS_PER_STEP` | `8` | browser-agent estimate assumption |
| `NODE_BIN` | `node` | Node 24.21+ binary used to spawn Pomerado |

## Testing (critical logic only)
`bun test`:
1. **Portal data and routes:**
   - signed-out requests redirect to `/login`, and a bad password shows an error
   - overdue is computed from `PORTAL_TODAY`, and the seed has an exact known overdue set (e.g. 7 IDs)
   - status filter plus pagination return the right rows
   - `add vendor` validation, the interstitial confirm, and the new ID
   - `/__reset` restores the seed and refuses non-loopback requests
2. **Router:** each example chip parses to the expected `{ integration, input }`. "add a new vendor …" returns `needs-confirm`, never a direct call. Unknown text returns help.
3. **`pomerado-client` job loop** against an **in-process fake MCP server** that mimics Pomerado's shapes:
   - immediate `structuredContent`
   - job → `get_job` → completed
   - `input_required` credential → `provide_input` with `{ username, password, saveLogin: false }`
   - a non-login question → surfaced error
   - write calls include an `idempotency_key` matching `^[A-Za-z0-9_-]{1,200}$`
   - a failed job with `possible_commit: true` is not retried
4. **Mode detection:** Node `v24.20.0` → replay, `v24.21.0` → local-eligible, `v25.0.0` → replay; Chromium missing → replay; no `integrations/` → replay with `synthetic`; `VERCEL=1` → replay. `OPENAI_API_KEY` presence never changes the mode.
5. **Integrations sanity** (skipped if not minted): every `integrations/*/deployment.json` decodes, `request.url` starts with `PORTAL_URL`, the effects are `read`/`read`/`write`, and no committed file contains `mcp.mjs`, `/home/`, `/Users/` or `sk-`.
6. **Replay fixtures:** they validate against `schema.ts`. `synthetic` is true iff `integrations/` is absent.
7. **`estimate.ts`:** step counts per task (pages scale with row count) and the ratio math.
8. **Optional `tests/live.test.ts`** (`LIVE_LOCAL=1`): real `serve` calls. `list_invoices {status:"overdue"}` equals the seed's overdue set, then `add_vendor` creates a vendor and `list_vendors` shows it, then reset.

Git hooks: none (demo app).

## Vercel
Root directory `apps/pomerado-legacy-portal`. `vercel.json`:
```json
{ "$schema": "https://openapi.vercel.sh/vercel.json", "framework": "vite", "installCommand": "bun install", "buildCommand": "bun run build", "outputDirectory": "dist" }
```
- **Vercel serves replay mode only.** Live runs need a long-lived Node 24 child process plus Chromium plus the portal, which aren't a fit for functions. `api/*.ts` are thin Node functions over `server/http.ts`. `"engines": { "node": "24.x" }`. No env vars are required. The badge says "Replay (recorded <date>)".
- `pomerado` must not be bundled into the client, and `api/*` must not import `pomerado-client.ts` in replay (dynamic import behind the mode check). This keeps the function size small. Move `pomerado` to `optionalDependencies` if the Vercel install trips on it.

## Acceptance criteria
- [ ] `bunfig.toml` exists with `minimumReleaseAge = 259200`, and `pomerado` is pinned to an exact version older than 72 h at install time.
- [ ] With **no env vars**, `bun install && bun run dev` starts the portal, API and UI. The badge shows `local` (Node 24.21+ and Chromium present, integrations minted) or `replay` with the reason.
- [ ] The portal is clunky but usable by hand: login, paginated invoices with Status + Go, vendors, the add-vendor form with the confirm interstitial.
- [ ] `integrations/list_invoices`, `list_vendors` and `add_vendor` are **real `pomerado-mcp mint` output** (`MINT_LOG.json` shows `build: "published"` for each). They contain no absolute paths or secrets, and each serves with `pomerado-mcp serve --artifact` with **no `OPENAI_API_KEY` set**.
- [ ] In `local` mode:
  - "list overdue invoices" returns exactly the seed's overdue set from a real run
  - the card shows the `tools/call` arguments, the job trail including the login answer, and the measured cold and warm latency
  - the estimate card sits beside it with steps, the formula and the ratio
- [ ] "add a new vendor …" shows a confirm form. Confirming runs `add_vendor` with an `idempotency_key`, the vendor appears in the portal and in "list vendors", and **Reset portal data** removes it.
- [ ] Pomerado's benchmark appears only as a cited claim with a link. All our numbers are labelled measured, recorded or estimate.
- [ ] Replay mode works with no Node 24 or Chromium, and on the Vercel preview. Synthetic fixtures are clearly labelled if minting wasn't possible.
- [ ] `bun test` and `bun run build` pass, and `rg -n "sk-|OPENAI_API_KEY=" dist integrations` finds nothing.
- [ ] The diff touches only `apps/pomerado-legacy-portal/**` plus one added row in the root `README.md` Demos table.

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running app, preferably in `local` mode (real Pomerado runs, no key needed once minted):
  - **Screenshot** (`media/screenshot.png`, embedded in the PR): the chat after "list overdue invoices", with the tool-call card (arguments, trail, result table, measured latency) beside the browser-agent estimate.
  - **Video**, committed at **`apps/pomerado-legacy-portal/media/demo.mp4`** and attached or linked in the PR (≤ 90 s):
    1. Show the clunky portal: log in, page through invoices.
    2. In the chat, "list overdue invoices", showing the tool call, latency and estimate.
    3. "add a new vendor Globex Supply, …", confirm, then the result.
    4. "list vendors" shows Globex, and the portal tab shows it too.
    5. Reset portal data.
    - Optionally, a split pane with `POMERADO_HEADED=1` showing Chromium being driven.
- The PR body states the mode of each capture (local, measured / replay, recorded / synthetic), the pinned Pomerado version, Node version, which URL path worked for minting, and the `MINT_LOG.json` mint times.
- Exactly one PR.

## README Demos row to add
```
| Pomerado Legacy Portal | [Pomerado (YC F26), X trending](https://x.com/i/trending/2114600496728092896) | <PR URL> |
```

## Deferred (and why)
- **LLM routing or an agent loop** (e.g. an OpenAI model choosing tools). It would add a key to the runtime path and blur "deterministic tool call" with "model reasoning". The rule-based router keeps the demo keyless and honest.
- **Minting from the UI.** It takes up to 20 min per mint, needs a key, and needs question/answer UX. The script is enough.
- **Live mode on Vercel.** It needs a browser host (e.g. a remote Playwright `--endpoint`) and a public portal. Out of scope.
- **Pomerado Cloud / hosted MCP and self-healing.** It needs an account, and the demo is about the open-source core.
- **A real measured browser-agent baseline** (actually running a computer-use agent). It costs money and adds a key. The estimate is labelled as one, and Pomerado's own benchmark is cited instead.
- **2FA on the portal.** Pomerado supports codes, but auto-answering them adds no insight for this demo.
