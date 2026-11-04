import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { formatInr, PRICING_SOURCE_URL } from "@/lib/pricing";
import type { RouteOk, RouteSource } from "@/lib/types";
import { EscalateBar } from "./EscalateBar";
import { ProbBars } from "./ProbBars";
import { UrgencyBar } from "./UrgencyBar";
import { Verdict } from "./Verdict";

function sourceLabel(source: RouteSource): string {
  switch (source) {
    case "live":
      return "Live sarvam-prism";
    case "fixture":
      return "Synthetic fixture";
    case "mock-heuristic":
      return "Mock heuristic (not Prism)";
    default: {
      const unreachable: never = source;
      return unreachable;
    }
  }
}

export function RoutingCard({
  route,
  pending,
  threshold,
  onThreshold,
}: {
  route: RouteOk | null;
  pending: boolean;
  threshold: number;
  onThreshold: (value: number) => void;
}) {
  const auto = route ? route.result.team.pTop >= threshold : false;
  return (
    <Card size="sm" className="min-h-0" data-testid="routing-card">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Routing</CardTitle>
        <div className="flex items-center gap-2">
          {pending ? (
            <span data-testid="routing-pulse" className="animate-pulse text-xs text-muted-foreground">
              routing…
            </span>
          ) : null}
          {route ? (
            <span data-testid="route-source" className="text-[11px] text-muted-foreground">
              {sourceLabel(route.source)}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {route ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Verdict auto={auto} choice={route.result.team.choice} />
              <span className="text-[11px] text-muted-foreground">
                p_top {(route.result.team.pTop * 100).toFixed(1)}% · confidence{" "}
                {route.result.team.confidence.toFixed(2)} (not a probability)
              </span>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium">Team</div>
              <ProbBars
                probabilities={route.result.team.probabilities}
                choice={route.result.team.choice}
              />
            </div>
            <UrgencyBar
              probabilities={route.result.urgency.probabilities}
              legend={route.result.urgency.legend}
              score={route.result.urgency.score}
              label={route.result.urgency.label}
            />
            <EscalateBar pYes={route.result.escalate.pYes} verdict={route.result.escalate.verdict} />
            <div className="flex items-center gap-3">
              <label className="shrink-0 text-xs" htmlFor="threshold">
                Threshold {threshold.toFixed(2)}
              </label>
              <Slider
                id="threshold"
                data-testid="threshold"
                aria-label="Auto-route threshold"
                min={0.5}
                max={0.99}
                step={0.01}
                value={[threshold]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  if (typeof next === "number") onThreshold(next);
                }}
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Verdict uses p_top ≥ threshold, the documented act-on-confidence pattern. Sarvam reports
              ~68.5% of English vs ~38.4% of Indic answers clear 0.9.
            </p>
            <p className="text-xs">
              {route.usage.input_tokens} input tokens · {formatInr(route.costInr)} this request ·{" "}
              {formatInr(route.costInr * 100_000)} / 1,00,000 ·{" "}
              <a
                href={PRICING_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                ₹4/1M
              </a>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="empty-state">
            Type a customer message. Classification starts after 6 characters and a 200 ms pause.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
