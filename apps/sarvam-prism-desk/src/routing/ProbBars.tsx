import { TEAM_LABEL, TEAMS, type TeamId } from "@/lib/types";

function isTeam(value: string): value is TeamId {
  return (TEAMS as readonly string[]).includes(value);
}

export function ProbBars({
  probabilities,
  choice,
}: {
  probabilities: Record<string, number>;
  choice: string;
}) {
  const order = TEAMS.filter((team) => team in probabilities);
  const extra = Object.keys(probabilities).filter((key) => !isTeam(key));
  const keys = [...order, ...extra];
  return (
    <div className="flex flex-col gap-1" data-testid="team-bars">
      {keys.map((key) => {
        const probability = probabilities[key] ?? 0;
        const top = key === choice;
        const label = isTeam(key) ? TEAM_LABEL[key] : key;
        return (
          <div key={key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2">
            <span className={top ? "text-xs font-medium" : "text-xs text-muted-foreground"}>{label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={top ? "h-full rounded-full bg-primary" : "h-full rounded-full bg-foreground/25"}
                style={{ width: `${Math.max(0, Math.min(1, probability)) * 100}%` }}
              />
            </div>
            <span className="text-right text-[11px] tabular-nums">{(probability * 100).toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}
