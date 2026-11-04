export function EscalateBar({ pYes, verdict }: { pYes: number; verdict: "yes" | "no" }) {
  return (
    <div data-testid="escalate-bar">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium">Escalate</span>
        <span>
          P(yes) {(pYes * 100).toFixed(1)}% ·{" "}
          <span data-testid="escalate-verdict">{verdict}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(1, pYes) * 100}%` }} />
      </div>
    </div>
  );
}
