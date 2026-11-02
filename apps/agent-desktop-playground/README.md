# Agent Desktop Playground

A one-screen dashboard for [agent-desktop](https://github.com/vercel-labs/agent-desktop): list the apps in a Linux session, read the accessibility tree, and run a plain-English task through the `snapshot` → qualified ref → `click` / `type` loop. Every step shows the argv, the `@snapshot:eN` ref, delivery, mechanism, and the raw JSON envelope.

The bookmark is [@ctatedev's launch post](https://x.com/ctatedev/status/2116323148706771302).

## Stack

- Bun, Vite, React 19, TypeScript, shadcn/ui (base-nova), Tailwind v4
- `agent-desktop` **1.0.1** (envelope `2.5`), called as the native binary `node_modules/agent-desktop/bin/agent-desktop-linux-x64`. Bun skips the package postinstall, so the Node launcher is never used.
- Scripted planner by default. `PLANNER=llm` is deferred.

## Run in replay

No desktop required. Recorded sessions under `fixtures/` play back through the same driver interface.

```bash
bun install
bun run dev
```

Open http://127.0.0.1:5173. The header badge is **Replay (recorded)** unless `MODE=live`.

## Run live

Needs the apps' own session bus, `DISPLAY`, and AT-SPI. On a machine that already has that session, `bun run dev` is enough when `status.supported_surfaces` is non-empty. In this repo's VM the API is started inside a private Xvfb + Openbox session (adapted from upstream `scripts/private-session.sh`, Apache-2.0):

```bash
sudo apt-get install -y at-spi2-core dbus-x11 xvfb x11-utils openbox gnome-text-editor gnome-calculator ffmpeg
bun run desktop -- bun run dev:api
# in another shell, from this directory:
bun run dev:web
```

`bun run doctor` prints the binary, the OS, apt packages, and the `status` envelope. It always exits 0.

`bun run record` (inside `bun run desktop --`) rewrites `fixtures/<scenario>/` from the three presets. Those fixtures are live recordings: `meta.json` has `"synthetic": false`.

## Presets

1. Open the text editor and write a to-do list
2. Open the calculator and compute 12 × 7
3. In the text editor, append `Ship the demo`

An unknown prompt returns the supported list. Replay of a prompt the scripted planner cannot match says `live desktop required`.

Refs are resolved from the latest snapshot. A `STALE_REF` whose `disposition.retry` is `safe` takes one new snapshot and retries once. The app never passes `--headed`.

## What was verified here

On Ubuntu 24.04.5 LTS, inside the private session, `status` reported `supported_surfaces: ["window", "sheet", "alert", "menu"]` and `permissions.accessibility.state: "granted"`. Preset 1 typed the to-do list into gnome-text-editor (`delivered_verified`). Preset 2 left gnome-calculator showing 84. Preset 3 typed `Ship the demo`. `bun test` and `bun run build` pass without a desktop.

Not verified on this VM: Wayland, `--headed` input, multi-agent cursors, the optional LLM planner.

## Privacy

Snapshots, screenshots, and traces can contain desktop contents. Fixtures were recorded in the private Xvfb session with the throwaway strings above, not from a personal desktop.

## Env

| var | default | |
| --- | --- | --- |
| `MODE` | `auto` | `live` when `supported_surfaces` is non-empty, otherwise replay |
| `PLANNER` | `scripted` | `llm` is deferred |
| `AGENT_DESKTOP_BIN` | resolved native binary | |
| `REPLAY_SPEED` | `1` | divides recorded step delays (fixture delays are at least 700ms so the log is readable) |
| `PORT` | `8787` | Vite on 5173 proxies `/api` |
