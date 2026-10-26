import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SceneError } from "@/lib/types";

export function ErrorCallout({
  error,
  disabled,
  onFix,
}: {
  error: SceneError;
  disabled?: boolean;
  onFix: () => void;
}) {
  return (
    <Alert variant="destructive" data-testid="error-callout" className="bg-background/95 shadow-sm">
      <AlertTitle className="flex items-center gap-2">
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] uppercase">{error.phase}</span>
        Scene failed
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <span>
          {error.message}
          {error.line ? ` (line ${error.line})` : ""}
        </span>
        <Button type="button" size="sm" variant="destructive" data-testid="fix-it" disabled={disabled} onClick={onFix}>
          Fix it
        </Button>
      </AlertDescription>
    </Alert>
  );
}
