import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LIVE_BANNER, MOCK_BANNER, RAM_NOTE } from "../../shared/copy.ts";
import type { ModePayload } from "../../shared/types.ts";

export function ModeBanner({ mode }: { mode: ModePayload }) {
  const recorded = mode.mode === "mock";
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge data-testid="recorded-badge" variant={recorded ? "secondary" : "default"}>
            {recorded ? MOCK_BANNER : `${LIVE_BANNER} · ${mode.model}`}
          </Badge>
          <Badge variant="outline">{mode.model}</Badge>
        </div>
        <p className="text-sm leading-relaxed">{mode.detail}</p>
        <p className="text-sm text-muted-foreground">{RAM_NOTE}</p>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Live setup</summary>
          <ul className="mt-2 grid gap-1">
            {mode.setup.map((step) => (
              <li key={step}>
                <code className="text-[0.8rem]">{step}</code>
              </li>
            ))}
          </ul>
        </details>
        <p className="text-sm text-muted-foreground">{mode.license}</p>
      </CardContent>
    </Card>
  );
}
