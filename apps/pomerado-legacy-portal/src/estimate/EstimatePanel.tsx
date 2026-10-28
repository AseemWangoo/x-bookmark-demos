import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  estimateSeconds,
  speedupRatio,
  stepsFor,
  totalSteps,
  type EstimateTask,
} from "@/lib/estimate";

export function EstimatePanel({
  task,
  rowCount,
  secondsPerStep,
  measuredSeconds,
}: {
  task: EstimateTask;
  rowCount: number;
  secondsPerStep: number;
  measuredSeconds: number | null;
}) {
  const steps = stepsFor(task, rowCount);
  const count = totalSteps(steps);
  const seconds = estimateSeconds(steps, secondsPerStep);
  const ratio = measuredSeconds === null ? null : speedupRatio(seconds, measuredSeconds);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Browser-agent estimate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ol className="space-y-1">
          {steps.map((step) => (
            <li key={step.label} className="flex justify-between gap-3">
              <span>{step.label}</span>
              <span className="tabular-nums text-muted-foreground">{step.count}</span>
            </li>
          ))}
        </ol>
        <p>
          {count} steps × {secondsPerStep} s = {seconds} s{" "}
          <span className="text-muted-foreground">(estimate)</span>
        </p>
        {ratio === null ? (
          <p className="text-muted-foreground">Speed-up appears once a run has a latency.</p>
        ) : (
          <p>
            Speed-up vs this run: {ratio.toFixed(1)}×{" "}
            <span className="text-muted-foreground">(estimate ÷ measured or recorded)</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
