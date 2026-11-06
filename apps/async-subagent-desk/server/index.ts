import { createMockBackend } from "./backend/mock.ts";
import { createLiveBackend } from "./backend/live.ts";
import { createApp } from "./http.ts";
import { selectDesk } from "./mode.ts";

const port = Number(Bun.env.PORT || 8787);
const selection = selectDesk({ env: Bun.env, argv: process.argv });

if (selection.kind === "invalid") {
  console.error(selection.reason);
  process.exit(1);
}

const backend =
  selection.kind === "live"
    ? createLiveBackend({ apiUrl: selection.apiUrl })
    : createMockBackend();

const app = createApp(backend);

Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch: (request) => app.handle(request),
});

console.log(
  `Async Subagent Desk API (${backend.mode}) on http://127.0.0.1:${port} — ${selection.kind === "mock" ? selection.reason : selection.apiUrl}`,
);
