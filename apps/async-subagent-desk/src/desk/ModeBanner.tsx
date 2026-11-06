import { Badge } from "@/components/ui/badge";
import type { ModePayload } from "@/lib/api";

export function ModeBanner({ mode }: { mode: ModePayload | null }) {
  const simulated = mode?.simulated ?? true;
  return (
    <section
      aria-label="Run mode"
      data-testid="mode-banner"
      data-mode={mode?.mode ?? "loading"}
      className="border-b bg-muted/40 px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={simulated ? "secondary" : "default"} data-testid="mode-badge">
          {mode?.banner ?? "Loading desk mode"}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {mode?.detail ?? "Checking whether a model key and Agent Server are configured."}
        </p>
      </div>
      <p className="mt-2 text-sm">
        Live mode needs an Agent Server and a model key. The key stays in the server process.
      </p>
      <ol className="mt-1 list-decimal ps-5 font-mono text-xs text-muted-foreground">
        {(mode?.commands ?? [
          "bun run agent-server",
          "LANGGRAPH_API_URL=http://127.0.0.1:2024 bun run dev -- --live",
        ]).map((command) => (
          <li key={command}>
            <code>{command}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}
