import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatProbability, formatValue } from "@/lib/format";
import { isUnrecorded, type Answer, type FieldResult, type FieldSpec } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfidenceBar } from "./ConfidenceBar.tsx";

type FieldCardProps = {
  field: FieldSpec;
  result: FieldResult;
  color: string;
  active: boolean;
  origin: "clairic" | "llm";
  onActive: (field: string | null) => void;
};

export function FieldCard({ field, result, color, active, origin, onActive }: FieldCardProps) {
  if (isUnrecorded(result)) {
    return (
      <Card
        id={`field-card-${field.name}`}
        data-testid="field-card"
        className="border-dashed"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-mono text-sm">{field.name || "(unnamed)"}</CardTitle>
            <Badge variant="outline">not recorded</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p data-testid="unrecorded" className="text-sm text-muted-foreground">
            {result.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const nullValue = result.value === null;
  const note = spanNote(result, origin);

  return (
    <Card
      id={`field-card-${field.name}`}
      data-testid="field-card"
      className={cn("cursor-pointer border-l-[3px] transition-shadow", active && "ring-2 ring-foreground")}
      style={{ borderLeftColor: color }}
      onMouseEnter={() => {
        onActive(field.name);
        document
          .querySelector(`[data-fields~="${CSS.escape(field.name)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }}
      onMouseLeave={() => onActive(null)}
      onClick={() => {
        onActive(field.name);
        document
          .querySelector(`[data-fields~="${CSS.escape(field.name)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <CardTitle className="font-mono text-sm">{field.name}</CardTitle>
          <Badge variant="secondary">{result.type}</Badge>
          {field.unit || ("unit" in result && result.unit) ? (
            <Badge variant="outline">{field.unit ?? ("unit" in result ? result.unit : "")}</Badge>
          ) : null}
          {nullValue ? (
            <Badge variant="destructive" data-testid="null-badge">
              Null
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <pre className="overflow-auto font-mono text-sm leading-5 whitespace-pre-wrap">
          {formatValue(result.value)}
        </pre>
        {origin === "clairic" ? <ConfidenceBar confidence={result.confidence} /> : null}
        {nullValue ? (
          <p className="text-xs text-muted-foreground">
            model would have guessed{" "}
            <span className="text-foreground/70">{formatValue(guessOf(result))}</span>
            {typeof result.p_null === "number" ? ` · p_null ${formatProbability(result.p_null)}` : ""}
          </p>
        ) : null}
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

function guessOf(result: Answer): string | number | null {
  switch (result.type) {
    case "list":
      return null;
    case "text":
    case "number":
    case "duration":
    case "date":
    case "time":
    case "datetime":
      return result.guess;
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

function spanNote(result: Exclude<FieldResult, { recorded: false }>, origin: "clairic" | "llm"): string | null {
  const hasSpan =
    (result.type === "text" && result.span !== null) ||
    (result.type === "list" && result.spans !== null && result.spans.length > 0);
  if (hasSpan) return null;
  if (origin === "llm") return "no confidence or spans";
  switch (result.type) {
    case "text":
    case "list":
      return "no span";
    case "number":
    case "date":
    case "time":
    case "datetime":
    case "duration":
      return "computed (no span)";
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}
