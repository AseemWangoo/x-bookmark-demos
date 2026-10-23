import type { Strategy } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export function RunBar({
  strategy,
  compare,
  threshold,
  running,
  onStrategy,
  onCompare,
  onThreshold,
  onRun,
}: {
  strategy: Strategy;
  compare: boolean;
  threshold: number;
  running: boolean;
  onStrategy: (strategy: Strategy) => void;
  onCompare: (compare: boolean) => void;
  onThreshold: (threshold: number) => void;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <Button type="button" data-testid="run-triage" disabled={running} onClick={onRun}>
          {running ? "Running…" : "Run triage"}
        </Button>
        <label className="flex w-52 flex-col gap-1.5 text-xs">
          <span className="text-muted-foreground">Strategy</span>
          <Select
            value={strategy}
            onValueChange={(value) => {
              if (value === "per_message" || value === "packed") onStrategy(value);
            }}
          >
            <SelectTrigger data-testid="strategy-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_message">Per message</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Switch
            checked={compare}
            onCheckedChange={(checked) => onCompare(checked === true)}
            data-testid="compare-toggle"
          />
          Compare with Responses API
        </label>
        <label className="flex min-w-56 flex-1 flex-col gap-2 pb-1 text-xs">
          <span className="flex justify-between text-muted-foreground">
            <span>Urgent threshold</span>
            <span className="tabular-nums text-foreground">{threshold.toFixed(2)}</span>
          </span>
          <Slider
            data-testid="urgent-threshold"
            min={0}
            max={1}
            step={0.05}
            value={[threshold]}
            onValueChange={(value) => {
              const next = value[0];
              if (typeof next === "number") onThreshold(next);
            }}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        {strategy === "packed"
          ? "Packed sends one request: every message in the input, and 3 questions per message named id.urgent, id.route, and id.priority. The cap is 400 questions. Sharing one context can lower accuracy."
          : "Per message sends one request per inbox item, 3 questions each, with concurrency 8. Rows fill in by that request’s latency."}
      </p>
    </div>
  );
}
