import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import type { ComponentRenderProps } from "@openuidev/react-lang";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { formatMoney } from "./format.ts";

export type BudgetItem = {
  category: string;
  amount: number;
};

type BudgetChartProps = {
  items: BudgetItem[];
  currency: string;
};

const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

export function BudgetChartView({
  props,
}: ComponentRenderProps<BudgetChartProps>) {
  const items = Array.isArray(props.items) ? props.items : [];
  const currency = props.currency || "USD";
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Budget</h3>
        <Badge variant="outline">{currency}</Badge>
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-44 w-full"
        initialDimension={{ width: 360, height: 176 }}
      >
        <BarChart data={items} layout="vertical" margin={{ left: 4, right: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            width={84}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatMoney(Number(value), currency)}
              />
            }
          />
          <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
        </BarChart>
      </ChartContainer>
      <p className="mt-1 text-right text-sm font-medium tabular-nums">
        {formatMoney(total, currency)}
      </p>
    </section>
  );
}
