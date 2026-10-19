import { Badge } from "@/components/ui/badge";
import type { ComponentRenderProps } from "@openuidev/react-lang";

type ItineraryCardProps = {
  city: string;
  days: number;
  summary: string;
  highlights: string[];
};

export function ItineraryCardView({
  props,
}: ComponentRenderProps<ItineraryCardProps>) {
  const highlights = Array.isArray(props.highlights) ? props.highlights : [];

  return (
    <section className="rounded-xl bg-muted/70 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-medium tracking-tight">{props.city}</h2>
        <Badge variant="secondary">
          {props.days} {props.days === 1 ? "day" : "days"}
        </Badge>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {props.summary}
      </p>
      {highlights.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {highlights.map((highlight) => (
            <li key={highlight}>
              <Badge variant="outline">{highlight}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
