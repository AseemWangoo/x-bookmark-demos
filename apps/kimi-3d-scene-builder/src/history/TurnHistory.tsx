import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMs, formatTokens, formatUsd, timingCaption } from "@/lib/format";
import { summarizeSession } from "@/lib/metrics";
import type { TurnRecord } from "@/lib/types";

export function TurnHistory({
  turns,
  cursor,
  disabled,
  onRestore,
}: {
  turns: TurnRecord[];
  cursor: number | null;
  disabled?: boolean;
  onRestore: (index: number) => void;
}) {
  const summary = summarizeSession(turns.map((turn) => ({ model: turn.model, totalMs: turn.timings.totalMs, costUsd: turn.costUsd })));
  const synthetic = turns.length === 0 || turns.every((turn) => turn.synthetic);
  const live = turns.some((turn) => !turn.synthetic);
  const caption = synthetic
    ? "Timings are illustrative."
    : live && turns.some((turn) => turn.synthetic)
      ? "Illustrative rows are hand-written. Live rows are measured on the server."
      : "Timings are measured on the server.";

  return (
    <div className="flex h-[228px] shrink-0 flex-col border-t" data-testid="history">
      <div className="flex items-center justify-between gap-3 px-4 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium">Turns</span>
          <Badge variant="outline">{timingCaption(synthetic && !live)}</Badge>
        </div>
        <div className="flex flex-wrap justify-end gap-x-3 text-muted-foreground">
          <span>Session {formatUsd(summary.sessionCostUsd)}</span>
          <Average label="Pro" value={summary.pro} />
          <Average label="Highspeed" value={summary.highspeed} />
          <span>{caption}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Effort</TableHead>
              <TableHead>TTFT</TableHead>
              <TableHead>First code</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>Cached</TableHead>
              <TableHead>Cache write</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead>Reasoning</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turns.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="text-muted-foreground">
                  No turns yet.
                </TableCell>
              </TableRow>
            )}
            {turns.map((turn, index) => {
              const later = cursor !== null && index > cursor;
              const selected = index === cursor;
              return (
                <TableRow
                  key={turn.id}
                  data-testid={`turn-${index}`}
                  data-status={turn.status}
                  className={`cursor-pointer ${later ? "opacity-40" : ""} ${selected ? "bg-muted/60" : ""}`}
                  onClick={() => {
                    if (!disabled) onRestore(index);
                  }}
                >
                  <TableCell>{turn.kind}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={turn.prompt}>
                    {turn.prompt}
                  </TableCell>
                  <TableCell title={turn.modelId}>{turn.model === "pro" ? "Pro" : "Highspeed"}</TableCell>
                  <TableCell>{turn.effort}</TableCell>
                  <TableCell>{formatMs(turn.timings.ttftMs)}</TableCell>
                  <TableCell>{formatMs(turn.timings.firstContentMs)}</TableCell>
                  <TableCell>{formatMs(turn.timings.totalMs)}</TableCell>
                  <TableCell>{formatTokens(turn.usage.prompt)}</TableCell>
                  <TableCell>{formatTokens(turn.usage.cached)}</TableCell>
                  <TableCell>{formatTokens(turn.usage.cacheWrite)}</TableCell>
                  <TableCell>{formatTokens(turn.usage.completion)}</TableCell>
                  <TableCell>{formatTokens(turn.usage.reasoning)}</TableCell>
                  <TableCell>{formatUsd(turn.costUsd)}</TableCell>
                  <TableCell>{turn.status}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Average({
  label,
  value,
}: {
  label: string;
  value: { count: number; avgTotalMs: number; avgCostUsd: number } | null;
}) {
  if (!value) return <span>{label} —</span>;
  return (
    <span>
      {label} avg {formatMs(value.avgTotalMs)} · {formatUsd(value.avgCostUsd)} ({value.count})
    </span>
  );
}
