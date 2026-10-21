import { Progress } from "@/components/ui/progress";
import { formatConfidence } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return <p className="text-xs text-muted-foreground">No confidence score</p>;
  }
  const pct = Math.max(0, Math.min(100, confidence * 100));
  const low = confidence < 0.5;
  return (
    <div className="flex items-center gap-2">
      <Progress
        value={pct}
        className={cn("h-1.5 flex-1", low && "[&_[data-slot=progress-indicator]]:bg-destructive")}
      />
      <span className={cn("w-12 text-right text-xs tabular-nums", low && "text-destructive")}>
        {formatConfidence(confidence)}
      </span>
    </div>
  );
}
