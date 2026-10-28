import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CallResult } from "@/lib/types";
import { objectRows } from "@/lib/rows";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatCell(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

export function ToolCallPanel({ result }: { result: CallResult }) {
  const tables = objectRows(result.output);
  const label = result.latencyLabel === "measured" ? "Measured" : "Recorded";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Tool call
          <Badge variant="outline">{result.integration}</Badge>
          {result.synthetic ? <Badge variant="secondary">synthetic</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="mb-1 text-muted-foreground">tools/call arguments</p>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(result.arguments, null, 2)}
          </pre>
        </div>
        <p>
          <span className="text-muted-foreground">Trail: </span>
          {result.trail.join(" → ")}
        </p>
        {result.error ? (
          <p role="alert" className="text-destructive">
            {result.error}
          </p>
        ) : result.possibleCommit ? (
          <p role="alert">It may have been created; list vendors to check.</p>
        ) : null}
        {tables.map((table) => (
          <div key={table.key} className="overflow-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  {Object.keys(table.rows[0] ?? {}).map((column) => (
                    <TableHead key={column} className="h-8 px-1.5 whitespace-normal">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row, index) => (
                  <TableRow key={index}>
                    {Object.keys(table.rows[0] ?? {}).map((column) => (
                      <TableCell key={column} className="px-1.5 py-1 whitespace-normal">
                        {formatCell(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
        {tables.length === 0 && result.output !== null && result.output !== undefined ? (
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(result.output, null, 2)}
          </pre>
        ) : null}
        <p>
          {label} cold {result.coldMs === null ? "—" : formatMs(result.coldMs)} · warm{" "}
          {result.warmMs === null ? "—" : formatMs(result.warmMs)}. This reply used the{" "}
          {result.cold ? "cold" : "warm"} time ({formatMs(result.ms)}). Model cost $0 (runs make no
          model request).
        </p>
      </CardContent>
    </Card>
  );
}
