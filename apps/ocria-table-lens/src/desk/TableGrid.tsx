import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toCsv } from "../../shared/csv.ts";
import { FLATTEN_NOTE, NO_TABLES } from "../../shared/copy.ts";
import type { TableGrid as Grid } from "../../shared/types.ts";
import { supportsInvokerCommands } from "../lib/commands.ts";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

type SortState = {
  index: number;
  direction: "ascending" | "descending";
};

type Row = {
  key: string;
  cells: string[];
};

export function TableLens({ tables }: { tables: Grid[] }) {
  if (tables.length === 0) {
    return (
      <section aria-labelledby="tables-heading">
        <h2 id="tables-heading" className="text-base font-medium">
          Tables
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{NO_TABLES}</p>
      </section>
    );
  }
  return (
    <section aria-labelledby="tables-heading" className="grid gap-4">
      <div>
        <h2 id="tables-heading" className="text-base font-medium">
          Tables
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{FLATTEN_NOTE}</p>
      </div>
      {tables.map((table) => (
        <SortableTable key={table.index} table={table} />
      ))}
    </section>
  );
}

function SortableTable({ table }: { table: Grid }) {
  const commands = supportsInvokerCommands();
  const [sort, setSort] = useState<SortState | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const sortRef = useRef(sort);
  const sortByRef = useRef<(index: number, label: string) => void>(() => undefined);
  sortRef.current = sort;
  const tableId = `lens-table-${table.index}`;
  const captionId = `lens-caption-${table.index}`;
  const rows = useMemo<Row[]>(
    () => table.rows.map((cells, index) => ({ key: `r${index}`, cells })),
    [table.rows],
  );
  const ordered = useMemo(() => orderRows(rows, sort), [rows, sort]);
  const caption = table.caption ?? `Table ${table.index + 1}`;

  function sortBy(index: number, label: string) {
    const current = sortRef.current;
    const direction: SortState["direction"] =
      current?.index === index && current.direction === "ascending" ? "descending" : "ascending";
    const next = { index, direction };
    sortRef.current = next;
    setSort(next);
    setSaved(null);
    setStatus(`Sorted by ${label}, ${direction}, ${rows.length} rows`);
  }
  sortByRef.current = sortBy;

  useEffect(() => {
    if (!commands) return;
    const node = document.getElementById(tableId);
    if (!node) return;
    const buttons = node.querySelectorAll<HTMLButtonElement>("thead button[data-sort-index]");
    for (const button of buttons) {
      button.setAttribute("command", "--sort");
      button.setAttribute("commandfor", tableId);
    }
    const onCommand = (event: Event) => {
      const commandEvent = event as Event & { command?: string; source?: HTMLElement | null };
      if (commandEvent.command !== "--sort") return;
      const source = commandEvent.source;
      if (!source || !node.contains(source)) return;
      const index = Number(source.dataset.sortIndex);
      if (!Number.isInteger(index)) return;
      sortByRef.current(index, source.dataset.sortLabel ?? `Column ${index + 1}`);
    };
    node.addEventListener("command", onCommand, true);
    return () => node.removeEventListener("command", onCommand, true);
  }, [commands, tableId]);

  function download() {
    const csv = toCsv(
      table.headers,
      ordered.map((row) => row.cells),
      table.footer,
    );
    const filename = `table-${table.index + 1}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setSaved(`Saved ${filename}`);
  }

  return (
    <div className="relative grid gap-2" data-testid="table-grid">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{table.headerNote ?? "Click a column to sort. The footer stays put."}</p>
        <Button type="button" variant="outline" data-testid="csv-export" onClick={download}>
          Download CSV
        </Button>
      </div>
      {saved ? (
        <p className="text-sm" role="status">
          {saved}
        </p>
      ) : null}
      <Table id={tableId} labelledBy={captionId} className="caption-top">
        <TableCaption id={captionId} className="mb-2 text-left text-foreground">
          {caption}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {table.headers.map((header, index) => {
              const label = header || `Column ${index + 1}`;
              const direction = sort?.index === index ? sort.direction : undefined;
              return (
                <TableHead key={`${label}-${index}`} scope="col" data-type="text" aria-sort={direction} className="h-auto p-0 whitespace-normal">
                  <button
                    type="button"
                    className="sort-button"
                    data-sort-index={index}
                    data-sort-label={label}
                    onClick={commands ? undefined : () => sortBy(index, label)}
                  >
                    {label}
                    <span className="sort-icon" aria-hidden="true" />
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((row) => (
            <TableRow key={row.key}>
              {row.cells.map((cell, index) => (
                <TableCell
                  key={`${row.key}-${index}`}
                  data-label={table.headers[index] || `Column ${index + 1}`}
                  className="whitespace-normal"
                  style={{ ["--cell-label" as string]: JSON.stringify(table.headers[index] || `Column ${index + 1}`) }}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {table.footer.length > 0 ? (
          <TableFooter>
            {table.footer.map((row, rowIndex) => (
              <TableRow key={`f${rowIndex}`}>
                {row.map((cell, index) => (
                  <TableCell key={`f${rowIndex}-${index}`} data-label={table.headers[index] || `Column ${index + 1}`}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        ) : null}
      </Table>
      <p className="clip-status" role="status">
        {status}
      </p>
    </div>
  );
}

function orderRows(rows: Row[], sort: SortState | null): Row[] {
  if (!sort) return rows;
  const factor = sort.direction === "ascending" ? 1 : -1;
  return rows
    .slice()
    .sort((left, right) => factor * collator.compare(left.cells[sort.index] ?? "", right.cells[sort.index] ?? ""));
}
