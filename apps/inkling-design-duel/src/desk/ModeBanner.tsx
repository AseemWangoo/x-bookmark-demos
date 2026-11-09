import { Badge } from "@/components/ui/badge";
import { LIVE_SETUP, type ModePayload } from "../../shared/duel.ts";

export function ModeBanner({ mode }: { mode: ModePayload | null }) {
  const mock = mode?.mode !== "live";
  return (
    <section aria-label="Run mode" data-testid="mode-banner" className="border-b bg-muted/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={mock ? "secondary" : "default"} data-testid="mode-badge">
          {mode?.banner ?? "Checking mode"}
        </Badge>
        <p className="text-sm text-muted-foreground">{mode?.detail ?? "Looking for TINKER_API_KEY on the server."}</p>
      </div>
      <ol className="mt-2 list-decimal space-y-0.5 ps-5 font-mono text-xs text-muted-foreground">
        {(mode?.commands ?? LIVE_SETUP).map((command) => (
          <li key={command}>
            <code>{command}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}
