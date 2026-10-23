import type { InboxMessage, NormalizedAnswers, TriageError, TriageRow } from "@/lib/types";
import { agreement } from "@/lib/agreement";
import { formatMs } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PriorityCell, RouteCell, UrgentCell } from "./AnswerCells";

export type InboxViewRow = {
  message: InboxMessage;
  decision?: TriageRow;
  error?: TriageError;
  revealed: boolean;
};

function AgreementMark({ answers, message }: { answers: NormalizedAnswers; message: InboxMessage }) {
  const result = agreement(message.expected, answers);
  const ok = result.matched === result.total;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={ok ? "text-foreground" : "text-destructive"} data-testid={`agreement-${message.id}`}>
          {ok ? "✓" : "✗"} {result.matched}/{result.total}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Urgent {result.urgent ? "matches" : "differs"} · route {result.route ? "matches" : "differs"} · priority{" "}
        {result.priority ? "matches" : "differs"}. The urgent boolean uses a 0.5 cutoff, not the slider.
      </TooltipContent>
    </Tooltip>
  );
}

export function InboxTable({
  rows,
  threshold,
  illustrative,
  onOpen,
}: {
  rows: InboxViewRow[];
  threshold: number;
  illustrative: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border" data-testid="inbox-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Urgent</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead className="text-right">{illustrative ? "Latency (illustrative)" : "Latency"}</TableHead>
            <TableHead>Agreement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const answers = row.revealed ? row.decision?.answers : undefined;
            const refused =
              answers &&
              (answers.urgent.refused ||
                answers.route.refused ||
                answers.priority.refused ||
                answers.urgent.unrecognised ||
                answers.route.unrecognised ||
                answers.priority.unrecognised);
            return (
              <TableRow
                key={row.message.id}
                data-testid={`row-${row.message.id}`}
                className="cursor-pointer"
                onClick={() => onOpen(row.message.id)}
              >
                <TableCell className="max-w-40 truncate text-xs">{row.message.from}</TableCell>
                <TableCell className="max-w-64">
                  <div className="truncate text-sm font-medium">{row.message.subject}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{row.message.channel}</Badge>
                </TableCell>
                <TableCell>
                  {row.error ? (
                    <span className="text-xs text-destructive">{row.error.message}</span>
                  ) : answers ? (
                    <UrgentCell answers={answers} threshold={threshold} />
                  ) : (
                    <span className="text-xs text-muted-foreground">{row.decision ? "scoring…" : "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {answers && !row.error ? <RouteCell id={row.message.id} answers={answers} /> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {answers && !row.error ? (
                    <PriorityCell id={row.message.id} answers={answers} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {refused ? (
                    <Badge variant="outline" data-testid={`refused-${row.message.id}`}>
                      Refused
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {answers && row.decision ? formatMs(row.decision.latencyMs) : "—"}
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {answers && !row.error ? <AgreementMark answers={answers} message={row.message} /> : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
