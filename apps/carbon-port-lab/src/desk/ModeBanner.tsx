import { Badge } from "@/components/ui/badge";
import type { ModePayload } from "../../shared/port.ts";

export function ModeBanner({ mode }: { mode: ModePayload | null }) {
  return (
    <section className="border-b border-border px-4 py-3" aria-label="Run mode">
      {mode ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={mode.mode === "mock" ? "secondary" : "default"}>
              {mode.mode === "mock" ? "Mock" : "Live"}
            </Badge>
            <p className="text-sm font-medium">{mode.banner}</p>
          </div>
          <p className="max-w-4xl text-sm text-muted-foreground">{mode.detail}</p>
          <p className="text-xs text-muted-foreground">
            Model <span className="font-mono text-foreground">{mode.model}</span>
          </p>
          <ol className="flex flex-col gap-1 font-mono text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
            {mode.setup.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Checking whether a gateway key is set…</p>
      )}
    </section>
  );
}
