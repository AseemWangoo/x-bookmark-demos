# Agent Desktop Playground: PLAN

Sources (all read 2026-11-02):
- [vercel-labs/agent-desktop](https://github.com/vercel-labs/agent-desktop) (Apache-2.0), commit `9eb9b29` (2026-10-31): `README.md`, `docs/install.md`, `docs/json-output.md`, `CONCEPTS.md`
- Bundled agent docs in that repo: `skills/agent-desktop/` (`references/commands-observation.md`, `commands-interaction.md`, `commands-system.md`) and `skills/agent-desktop-linux/` (`SKILL.md`, `references/display-servers-and-input.md`, `windows-and-lifecycle.md`, `capture-and-clipboard.md`). The same text ships in the binary: `agent-desktop skills get desktop` / `skills get linux`.
- Upstream Linux CI: `scripts/private-session.sh` (private dbus + Xvfb + Openbox session), `tests/e2e-linux/README.md`, `tests/linux-dist/README.md`, `.github/workflows/release-dry-run.yml` (apt package list)
- [npm: agent-desktop](https://www.npmjs.com/package/agent-desktop) (`npm view agent-desktop time`)
- Bookmark: [@ctatedev launch post](https://x.com/ctatedev/status/2116323148706771302) (2026-10-31 00:15 UTC = 05:45 IST): "agent-browser, for your whole computer. Computer Use for any coding agent. macOS, Windows and Linux. Runs in bg while you keep working. Agents use your computer in parallel, each with its own cursor."

## What agent-desktop is (verified 2026-11-02)
- **A Rust CLI plus a C library (`libagent_desktop_ffi`)**, not a JS API. Every command prints **one JSON envelope** on stdout: `{ version: "2.5", ok, command, data }` or `{ version, ok: false, command, error: { code, message, suggestion?, details?, disposition: { delivery, retry } } }`. Exit codes: `0` ok, `1` structured error, `2` argument error. The app drives it by spawning the CLI and parsing that envelope.
- **Install:** `npm install -g agent-desktop` (Bun, pnpm and Yarn install the same package). The package ships native binaries for linux/darwin/win32 x64+arm64 in `node_modules/agent-desktop/bin/` (for example `agent-desktop-linux-x64` plus `agent-desktop-linux-clipboard-owner-linux-x64`). Its `postinstall` swaps the Node launcher (`#!/usr/bin/env node`) for the native binary. Bun does not run untrusted postinstall scripts, so **call the native binary directly** (see `server/bin.ts`), not `node_modules/.bin/agent-desktop`.
- **Versions:** `1.0.2` was published 2026-10-30T21:18Z, `1.0.1` on 2026-10-28T03:42Z. With the repo's `minimumReleaseAge = 259200` (3 days), `bun add agent-desktop` resolved **1.0.1** on 2026-11-02 (probed). 1.0.2 becomes eligible after 2026-11-03 02:48 IST. Either is fine; the envelope version is `2.5` for both. Pin whatever bun resolves and record it in the README.
- **Core loop:** `snapshot` → act on a ref → `snapshot` again to verify.
  - `agent-desktop snapshot --app <name> -i` (interactive elements only; add `--compact`, `--skeleton`, `--root <ref>`, `--max-depth`, `--window-id` as needed). `data` has `app`, `window { id, title }`, `snapshot_id`, `ref_count`, `complete`, `tree` (nodes with `role`, `name`, `ref_id`, `available_actions`, `children`).
  - **Refs are qualified**: `@<snapshot_id>:eN` (for example `@s8f3k2p9:e8`). A bare `@e8` is rejected with `INVALID_ARGS`. When the UI changes an action can return `STALE_REF` or `AMBIGUOUS_TARGET`; take a new snapshot.
  - Act: `click <ref>`, `type <ref> "text"`, `set-value`, `clear`, `press <key>`, `select`, `toggle`, … Results carry `data.steps[]` (`label`, `outcome`, `mechanism: semantic_api | physical_synthetic`, `verified`), `data.disposition.delivery` (`delivered_verified | delivered_unverified | not_delivered`) and `data.post_state`.
  - Apps: `list-apps` → rows `{ name, pid, bundle_id, presentation }`; `launch gnome-text-editor`; `wait --window "Text Editor" --app gnome-text-editor`; `list-windows`; `close-app`.
  - Retry only when `error.disposition.retry` is `safe`.
  - Capture: `screenshot --app <name> out.png` works on X11 without a permission.
- **Headless by default.** Ref actions go through the accessibility API without moving the pointer or taking focus. On Linux, headless `type` writes through AT-SPI `EditableText.InsertText` (literal newlines are fine). `--headed` sends physical XTEST keys and refuses control characters, so **the app never passes `--headed`**.
- **Sessions and cursors:** `session start --name x` → `data.session_id`. Pass it with `--session <id>` or `AGENT_DESKTOP_SESSION`. `session start --cursor --multi-agent` with `--agent-id <id>` gives each agent its own cursor; on Linux it draws **on X11 only** (Wayland saves the setting with `rendered: false`). `trace show` / `trace export` give a timeline.
- **Linux requirements:** Ubuntu 24.04+ with GNOME 46 is the primary target (glibc 2.35 floor). Ubuntu 22.04's ATK bridge aborts on `Action.GetActions`. It must run **inside the target apps' graphical session** with **`at-spi2-core`** installed. A TTY/SSH shell or a container without that session's bus, `DISPLAY` and runtime dir sees no apps. `agent-desktop status` activates and checks the bus; an empty `supported_surfaces` means the bus did not answer. X11 keys need XTEST. Chromium/Qt apps need a launch flag to appear on the bus.
- **Upstream CI already runs it headless on Linux:** `scripts/private-session.sh --wm` starts a private `dbus-daemon`, `Xvfb :100+`, Openbox, and a keyfile GSettings with `toolkit-accessibility=true`. The `x11-openbox` e2e tier drives gnome-calculator and **gnome-text-editor** (leg `state.text_editor_semantic_type`: "the semantic type path writes the typed text into the document"). Its apt list: `at-spi2-core dbus-x11 xvfb x11-utils openbox gnome-calculator python3-gi gir1.2-atspi-2.0 gir1.2-gtk-3.0`, plus `gnome-text-editor xdotool wmctrl xclip` for the e2e legs.
- **Probe on our Debian 13 box (2026-11-02):** the 1.0.1 binary runs (`version` → `{"os":"linux","target":"x86_64","version":"1.0.1"}`). Inside a private Xvfb + dbus session **without at-spi2-core**:
  - `status` → `ok: true`, `permissions.accessibility.state: "denied"`, `supported_surfaces: []`
  - `list-apps` → `PLATFORM_NOT_SUPPORTED` ("The AT-SPI accessibility bus is not available in this session")
  - `snapshot` → `PERM_DENIED`

  We could not install at-spi2-core because apt was blocked on the box, so a full live run is **not yet proven in our VMs**. These exact envelopes are what replay-mode detection keys off.
- **Privacy:** snapshots, screenshots and traces can contain private desktop content. Record fixtures only from the private Xvfb session with throwaway text, never from a personal desktop.

### Not verified (isolate in one file each)
- Whether the cloud agent VM has sudo/apt, Ubuntu 24.04 and GTK4 apps. `scripts/desktop-doctor.ts` checks this and the app falls back to replay.
- The exact roles and names gnome-text-editor exposes on this stack (expect a `window` with a multi-line text node; GTK4 nests deeply). `server/planner/refs.ts` is the only place that picks refs by role/name, and it is unit-tested against the recorded snapshot.
- The `--multi-agent` cursor overlay inside Xvfb + Openbox. It is optional polish only (see Deferred).

## Goal
A small Bun web dashboard on a Linux desktop. It lists the running apps, shows the live accessibility tree of the app you pick, and runs a plain-English task ("open the text editor and write a to-do list") through agent-desktop's `snapshot` → ref → `click`/`type` loop. It logs each step next to the exact refs and envelopes it used. A **replay mode** plays back a recorded session, so the demo and the PR video work without a live desktop.

## Single-user MVP
In:
- **Mode badge** in the header: **Live (AT-SPI)** when `status` shows a non-empty `supported_surfaces`, otherwise **Replay (recorded)**, with the reason (e.g. `PLATFORM_NOT_SUPPORTED: AT-SPI bus not available`). `MODE=live|replay|auto` (default `auto`) overrides it.
- **Apps panel:** `list-apps` rows (name, pid, presentation). Refresh button. Click a row to select it.
- **Tree panel:** `snapshot --app <name> -i --compact` rendered as a collapsible tree (role, name, `ref_id` chip, `available_actions`). It shows `snapshot_id`, `ref_count` and `complete`, and a node filter box. Refs used by the current run are highlighted. Auto-refreshes after each step.
- **Desktop view (small):** after each step, a PNG from `screenshot --app <name>` (X11). In replay, the recorded PNG. Optional if capture fails; the tree is the primary view.
- **Task runner:** a text box plus 3 preset chips:
  1. "Open the text editor and write a to-do list"
  2. "Open the calculator and compute 12 × 7"
  3. "In the text editor, append 'Ship the demo'"

  **Run** streams steps over SSE (or polling). Each step is a row: `#`, intent ("find the document text area"), command argv (`type @s…:e12 "…"`), the **refs used** (chips that link to the tree node), `snapshot_id`, result `ok`/`code`, `delivery`, `mechanism`, and ms. Expand a row to see the raw envelope JSON. Failed steps show `error.code`, `suggestion`, and whether a retry is `safe`.
- **Planner:** **deterministic scripted planner by default** (`PLANNER=scripted`). Keyword/regex intent matching maps the prompt to a template of abstract steps: `launch(app)` → `wait(window)` → `snapshot` → `pickRef(role/name predicate)` → `type|click(ref, text)` → `snapshot` → `verify(get value contains text)`. Text comes from the prompt (to-do items are generated deterministically, e.g. "To-do:\n- Plan\n- Build\n- Record demo"). Refs are **always resolved from the latest real snapshot**, never invented. An unknown prompt gives a clear "Scripted planner supports: …" message. Optional: `PLANNER=llm` with `OPENAI_API_KEY` (model from `PLANNER_MODEL`, no default baked in). The LLM gets the prompt plus the compact snapshot and may only return steps from the same typed step vocabulary (zod-validated), chosen one step at a time. Off by default and not used for the captures.
- **Replay mode:** `fixtures/<scenario>/` holds `apps.json`, the `snapshot-*.json` sequence, `steps.jsonl` (argv + envelope + ms per step) and `screens/*.png`. The replay engine serves those envelopes through the **same** `DesktopDriver` interface as live. A run of a preset prompt replays its recording with scaled timing (`REPLAY_SPEED`). Free-text prompts in replay run the scripted planner against recorded snapshots where they match, otherwise say "live desktop required".
- **Recording:** `bun run record` (live only) runs each preset prompt and writes its fixture folder. If live is impossible in the VM, ship **hand-written fixtures** that follow the documented envelope shape exactly. Mark them `synthetic: true`, show a "synthetic recording" badge in the UI, and say so in the PR.

Out (explicit): Windows/macOS, Wayland, `--headed`/pointer gestures, multi-agent cursors, notifications/tray, the FFI library, Chromium/Electron apps, deployment, auth, persistence beyond fixture files.

## Architecture
```
browser (Vite/React/shadcn)  ──HTTP/SSE──>  Bun.serve API (server/)
                                              ├─ DesktopDriver (interface)
                                              │    ├─ LiveDriver: Bun.spawn(binary, argv) → parse envelope
                                              │    └─ ReplayDriver: fixtures/<scenario>/* → same envelopes
                                              ├─ planner/ (scripted default | llm optional) → abstract steps
                                              └─ runner: executes steps, resolves refs from latest snapshot,
                                                         emits StepLog events (SSE)
LiveDriver runs inside: scripts/desktop-session.sh  (dbus + at-spi + Xvfb + Openbox + toolkit-accessibility=true)
```
- `Bun.spawn` with an **argv array, no shell**. Default timeout per call is 20 s. Text args that start with `-` use `--arg=` style or are placed after the ref as documented. stderr is captured into the step log.
- One agent-desktop **session** per run (`session start --name playground-<ts>`, `--session <id>` on every call, `session end` at the end). `trace show` is available from the run panel (live only).
- The API server must run **inside** the desktop session (same `DBUS_SESSION_BUS_ADDRESS`, `DISPLAY`, `XDG_RUNTIME_DIR`). The Vite dev server and Playwright can run outside it.

## Stack (one line each)
- **Bun**: repo-standard runtime, test runner, `Bun.spawn` for the CLI, and `Bun.serve` for the API.
- **Vite + React 19 + TS** (`bunx create-vite --template react-ts`): a one-screen dashboard, matching the other apps.
- **shadcn/ui (minimalist) + Tailwind v4**: Card, Badge, Button, Input, ScrollArea, Collapsible, Tabs, Sonner, as needed.
- **agent-desktop (npm, native binary)**: the product being demoed, driven through its documented CLI + JSON envelopes.
- **zod**: parses envelopes and planner steps (`ok`/`error` discriminated union; unknown keys ignored, as the docs require).
- **Openbox + Xvfb + dbus + at-spi2-core**: the same headless desktop recipe upstream CI uses (`scripts/private-session.sh`, Apache-2.0; adapt with attribution).
- **Playwright (dev) + ffmpeg**: scripted screenshot and video of the dashboard.
- **openai (optional, only if `PLANNER=llm` is built)**: add it only if that slice is done; otherwise defer.

## File layout
```
apps/agent-desktop-playground/
  bunfig.toml package.json vite.config.ts index.html components.json README.md PLAN.md .gitignore
  scripts/
    desktop-session.sh   # adapted from upstream private-session.sh: dbus, Xvfb :100+, openbox, a11y keyfile; runs a command inside
    desktop-doctor.ts    # prints: binary path+version, status envelope, at-spi present?, DISPLAY, apps installed; exit 0 always
    record.ts            # live: run presets → fixtures/<scenario>/
    capture.ts           # Playwright screenshot + video → media/
  server/
    index.ts  http.ts  env.ts          # MODE, PLANNER, PORT, REPLAY_SPEED, AGENT_DESKTOP_BIN
    bin.ts                             # resolve native binary: AGENT_DESKTOP_BIN → node_modules/agent-desktop/bin/agent-desktop-<os>-<arch>
    envelope.ts                        # zod schema + helpers (isRetrySafe, delivery, refsIn)
    driver/ types.ts live.ts replay.ts # DesktopDriver: status, listApps, snapshot, launch, wait, click, type, get, screenshot, session
    planner/ scripted.ts llm.ts refs.ts steps.ts
    runner.ts                          # executes steps, emits StepLog
  fixtures/<scenario>/                 # apps.json snapshot-NN.json steps.jsonl screens/*.png meta.json {synthetic, version, recordedAt}
  src/  App.tsx main.tsx index.css
    apps/AppsPanel.tsx  tree/TreePanel.tsx TreeNode.tsx  run/TaskBar.tsx StepLog.tsx StepRow.tsx  desktop/DesktopView.tsx  lib/api.ts types.ts
  tests/  envelope.test.ts refs.test.ts scripted.test.ts runner.replay.test.ts bin.test.ts http.test.ts
  media/screenshot.png media/demo.mp4
```

## Env vars
| var | default | notes |
| --- | --- | --- |
| `MODE` | `auto` | `auto` = live when `status.supported_surfaces` is non-empty, else replay |
| `PLANNER` | `scripted` | `llm` needs `OPENAI_API_KEY` + `PLANNER_MODEL` |
| `AGENT_DESKTOP_BIN` | (resolved) | override the binary path |
| `REPLAY_SPEED` | `1` | divides recorded step delays |
| `PORT` | `8787` | API; Vite on 5173 proxies `/api` |

## Milestones (vertical slices)
1. **Scaffold.** `bunfig.toml` first, then `bunx create-vite` (no install) → `bun install`, `bunx shadcn@latest init` (minimal), `bun add agent-desktop zod`. Record the resolved agent-desktop version.
2. **Desktop doctor + session script.** `bun run doctor` and `bun run desktop -- <cmd>`. Try `sudo apt-get install -y at-spi2-core dbus-x11 xvfb x11-utils openbox gnome-text-editor gnome-calculator ffmpeg`. If `status` inside the session shows non-empty `supported_surfaces` and `list-apps` lists a launched `gnome-text-editor`, live is go. **Time-box live bring-up to ~45 min**; if it fails, note the exact envelopes in the README and continue in replay.
3. **Envelope + driver + replay.** zod envelope, `ReplayDriver` and fixtures (recorded via step 6 if live, otherwise hand-written `synthetic`). `/api/mode`, `/api/apps`, `/api/snapshot?app=`.
4. **Dashboard read-only.** Apps panel, tree panel, mode badge. Works fully in replay.
5. **Scripted planner + runner + step log.** `/api/run` (SSE), ref resolution from the latest snapshot, step rows with ref chips linked to the tree, and verification (`get` value contains text).
6. **Live driver + record.** `LiveDriver` via `Bun.spawn`, session start/end, screenshots. `bun run record` writes real fixtures (`synthetic: false`) for the 3 presets.
7. **Polish + docs.** Empty/loading/error states, a "replay" banner, and a README covering what it is, sources, verified vs not, how to run live (`bun run desktop -- bun run dev:api`) and in replay, apt deps, and the privacy note. Append one row to the root README Demos table.
8. **Capture + PR.** `bun run capture` and one PR (see Validation).
9. *(optional)* `PLANNER=llm` slice, only if 1–8 are done.

## Testing (critical logic only, `bun test`, no desktop, no network)
1. **envelope.ts:** parses the README sample snapshot, the probed `status`/`list-apps`/`snapshot` error envelopes (copied verbatim above) and an action result with `steps`/`disposition`. Unknown keys pass. `isRetrySafe` follows `error.disposition.retry`.
2. **Mode detection:** a `status` with `supported_surfaces: []` gives replay with the reason; a non-empty one gives live; `MODE` overrides.
3. **refs.ts:** finds the text-editor document node and the calculator buttons in the fixture snapshots. Always returns **qualified** `@snap:eN` refs from that snapshot. Never returns a bare `@eN`. No match gives a typed "not found" step, not a guess.
4. **scripted planner:** each preset prompt produces the same step list (snapshot test). An unknown prompt gives the supported-list message. The to-do text is deterministic.
5. **runner (replay):** running preset 1 against its fixture emits the expected StepLog sequence with refs, codes and deliveries. A `STALE_REF` envelope triggers exactly one re-snapshot then retry.
6. **bin.ts / argv:** resolves the platform binary and builds argv arrays (no shell string). Never includes `--headed`. Includes `--session`.
7. **http:** `/api/mode` and `/api/apps` in replay without any binary present.
- UI is checked manually and in the video. Git hooks: none.

## Acceptance criteria
- [ ] `bun install && bun run dev` with **no env and no desktop** starts in **Replay** with the reason shown. Apps list, tree and all 3 presets run end-to-end with the step log and ref chips.
- [ ] Every step row shows the command, the qualified ref(s) used, `snapshot_id`, `ok`/`error.code`, `delivery` and the duration. Clicking a ref chip highlights that node in the tree. Raw envelopes are viewable.
- [ ] Preset 1 ends with a verification step that reads back the typed to-do text (`delivered_verified` or a `get` value match).
- [ ] If live works in the VM: `bun run desktop -- bun run dev:api` shows **Live**, lists the launched `gnome-text-editor`, and preset 1 types the to-do list into the real editor (visible in the desktop screenshot pane). Fixtures in the PR are then real recordings (`synthetic: false`).
- [ ] If live does not work: the README and PR say so, with the doctor output, and fixtures are `synthetic: true` and badged in the UI.
- [ ] No refs are invented: every ref in a step appears in the snapshot it cites (tested).
- [ ] `bun test` and `bun run build` pass.
- [ ] The diff touches only `apps/agent-desktop-playground/**` plus one added row in the root `README.md` Demos table.

## Validation (required)
- The PR MUST include **at least one screenshot AND at least one video** of the running dashboard.
  - **Screenshot** `media/screenshot.png`: after preset 1, showing the apps list with Text Editor selected, the tree with highlighted refs, the step log with ref chips and the desktop pane (or replay frame). Embed it in the PR body.
  - **Video** `media/demo.mp4` (H.264, **~20–40 s**, 1280×800). Use `bun run capture`: Playwright `recordVideo` → webm → `ffmpeg -c:v libx264 -pix_fmt yuv420p -movflags +faststart`. Commit it and link or attach it in the PR. Script:
    1. Dashboard loads; the mode badge is visible. Apps list → pick Text Editor → the tree appears.
    2. Click preset 1 → Run. Steps stream in (launch, wait, snapshot, type `@…:eN`, verify), and ref chips light up tree nodes. The desktop pane shows the text.
    3. Click a ref chip, then expand one raw envelope.
    4. Run preset 2 (calculator) quickly with `REPLAY_SPEED` > 1.
- The PR body states the mode the captures used (live vs replay; synthetic or recorded), the agent-desktop version, the VM OS and doctor output, and the commands to run it live.
- Exactly one PR. Only `apps/agent-desktop-playground/**` plus one README Demos row changed.

## Risks and fallback
| risk | likelihood | mitigation |
| --- | --- | --- |
| Cloud VM has no graphical session / AT-SPI | high | Private Xvfb + Openbox + dbus session as upstream CI does. If apt or the bus fails, use **replay mode** (default when `status` shows no surfaces). The demo and video never depend on live. |
| VM OS older than Ubuntu 24.04 (22.04 ATK bridge abort) | medium | Doctor reports the OS. Prefer GTK4 apps (gnome-text-editor) or fall back to replay. |
| bun skips postinstall, so the Node launcher is not replaced | certain | Call the native binary directly (`server/bin.ts`). |
| `minimumReleaseAge` blocks the newest version | certain today | Accept 1.0.1. The envelope contract (`2.5`) is the same. |
| GTK4 tree shape differs from expectations | medium | Pick refs by role/name predicates over the real snapshot, test against recorded fixtures, and take a fresh snapshot on `STALE_REF`/`AMBIGUOUS_TARGET`. |
| Private desktop content leaking into fixtures | low | Record only in the private Xvfb session with throwaway text. |
| LLM planner nondeterminism | n/a by default | Scripted planner is the default. LLM is opt-in and restricted to the typed step vocabulary. |

## Deferred (and why)
- **Multi-agent cursors** (`session start --cursor --multi-agent`, `--agent-id`; X11 only on Linux). It is the launch post's headline, but it needs two parallel runners and visible cursors in Xvfb. A good follow-up once live is proven.
- **LLM planner by default.** Determinism matters for tests and the video.
- **Wayland, headed input, notifications, tray.** They depend on GNOME Shell/Mutter and aren't needed to show the snapshot → ref → act loop.
- **FFI in-process binding.** The CLI is cheap enough (~21 ms per native call per upstream docs) and simpler.
- **`trace export` HTML viewer embed.** Nice, but the step log already covers it.
- **Deployment.** A Vercel deploy can only be replay mode. Skip it.
