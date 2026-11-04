import { Badge } from "@/components/ui/badge";

export function ModeBadge({ mode, model }: { mode: "mock" | "live"; model: string }) {
  return (
    <Badge data-testid="mode-badge" variant={mode === "mock" ? "secondary" : "default"}>
      {mode === "mock" ? "Mock: synthetic fixtures" : `Live: ${model}`}
    </Badge>
  );
}
