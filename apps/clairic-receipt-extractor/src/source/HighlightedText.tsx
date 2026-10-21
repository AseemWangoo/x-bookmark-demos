import { cn } from "@/lib/utils";
import { buildHighlightSegments, type SpanMark } from "./segments.ts";
import { stripeBackground } from "./colors.ts";

type HighlightedTextProps = {
  source: string;
  spans: SpanMark[];
  colorForField: (field: string) => string;
  activeField: string | null;
  onActiveField: (field: string | null) => void;
};

export function HighlightedText({
  source,
  spans,
  colorForField,
  activeField,
  onActiveField,
}: HighlightedTextProps) {
  const segments = buildHighlightSegments(source, spans);

  return (
    <pre
      data-testid="source-highlight"
      className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-3 font-mono text-[13px] leading-6"
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.text}</span>;
        }
        const colors = segment.fields.map((field) => colorForField(field));
        const active = segment.fields.some((field) => field === activeField);
        const primary = segment.fields[0] ?? null;
        return (
          <mark
            key={index}
            data-fields={segment.fields.join(" ")}
            data-testid="span"
            title={segment.fields.join(", ")}
            className={cn(
              "rounded-sm px-0.5 text-foreground",
              active && "outline outline-2 outline-offset-1 outline-foreground",
            )}
            style={{
              backgroundColor: colors.length === 1 ? colors[0] : "transparent",
              backgroundImage: colors.length > 1 ? stripeBackground(colors) : undefined,
            }}
            onMouseEnter={() => onActiveField(primary)}
            onMouseLeave={() => onActiveField(null)}
            onClick={() => {
              if (!primary) return;
              onActiveField(primary);
              document.getElementById(`field-card-${primary}`)?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }}
          >
            {segment.text}
          </mark>
        );
      })}
    </pre>
  );
}
