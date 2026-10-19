import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ComponentRenderProps } from "@openuidev/react-lang";

export type DayRow = {
  day: string;
  time: string;
  activity: string;
  area: string;
  cost: number;
};

type DayTableProps = {
  rows: DayRow[];
};

export function DayTableView({ props }: ComponentRenderProps<DayTableProps>) {
  const rows = Array.isArray(props.rows) ? props.rows : [];

  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-sm font-medium">Day by day</h3>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-8">Day</TableHead>
              <TableHead className="h-8">Time</TableHead>
              <TableHead className="h-8">Activity</TableHead>
              <TableHead className="h-8">Area</TableHead>
              <TableHead className="h-8 text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.day}-${row.time}-${index}`}>
                <TableCell className="py-1.5 text-xs">{row.day}</TableCell>
                <TableCell className="py-1.5 text-xs tabular-nums">
                  {row.time}
                </TableCell>
                <TableCell className="py-1.5 text-xs">{row.activity}</TableCell>
                <TableCell className="py-1.5 text-xs text-muted-foreground">
                  {row.area}
                </TableCell>
                <TableCell className="py-1.5 text-right text-xs tabular-nums">
                  {Number(row.cost).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
