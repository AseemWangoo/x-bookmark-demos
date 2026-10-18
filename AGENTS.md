# AGENTS.md

Rules for coding and cloud agents working in this repository.

## Scope
- Only add or modify files under `apps/<slug>/` for the demo being built. The single exception: append one row to the **Demos** table in `README.md`.
- Never create a new repository. All demos live in this repo.

## Stack
- Use Bun as the runtime, package manager, and script runner.
- Each app is self-contained with its own `package.json`.
- Each app must have a `bunfig.toml` created BEFORE any install, containing:

  ```toml
  [install]
  minimumReleaseAge = 259200
  ```
- Start from an official scaffold via `bunx create-*` (e.g. `bunx create-next-app`, `bunx create-vite`). Prefer scaffold flags that skip the initial install, then run `bun install`.
- For UI, use shadcn/ui with a minimalist preset (`bunx shadcn@latest init`). Add components on demand (`bunx shadcn@latest add <component>`), not preemptively.

## Planning
- Read `apps/<slug>/PLAN.md` before writing code.
- Follow `skills/project-planning/SKILL.md`.
- Build a single-user MVP. Prefer prebuilt over bespoke.
- Write tests only for critical logic.

## Pull requests
- Open exactly ONE PR per demo.
- The PR MUST include at least one screenshot AND at least one video of the running app. These are required validation artifacts, not optional.
