import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ComponentRenderProps } from "@openuidev/react-lang";

type TripPlanProps = {
  title: string;
  children: unknown[];
};

export function TripPlanView({
  props,
  renderNode,
}: ComponentRenderProps<TripPlanProps>) {
  const children = Array.isArray(props.children) ? props.children : [];
  const [itinerary, days, budget, book, ...rest] = children;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid items-start gap-4 lg:grid-cols-2">
        {itinerary != null ? (
          <div className="lg:col-span-2">{renderNode(itinerary)}</div>
        ) : null}
        {days != null ? <div className="min-w-0">{renderNode(days)}</div> : null}
        {budget != null || book != null ? (
          <div className="flex min-w-0 flex-col gap-4">
            {budget != null ? renderNode(budget) : null}
            {book != null ? renderNode(book) : null}
          </div>
        ) : null}
        {rest.length > 0 ? (
          <div className="flex flex-col gap-4 lg:col-span-2">{renderNode(rest)}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
