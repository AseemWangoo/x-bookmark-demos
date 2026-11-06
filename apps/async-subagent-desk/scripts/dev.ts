const live = process.argv.includes("--live");
const env: Record<string, string | undefined> = { ...process.env };
if (live) env.DESK_MODE = "live";

const api = Bun.spawn(["bun", "--watch", "server/index.ts"], {
  env,
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

const web = Bun.spawn(
  ["bun", "run", "vite", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
  {
    env,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  },
);

let stopped = false;
function shutdown(): void {
  if (stopped) return;
  stopped = true;
  api.kill();
  web.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const code = await Promise.race([api.exited, web.exited]);
shutdown();
process.exit(code ?? 0);
