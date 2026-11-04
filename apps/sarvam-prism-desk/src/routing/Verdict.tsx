import { Badge } from "@/components/ui/badge";
import { TEAM_LABEL, type TeamId } from "@/lib/types";

function teamName(choice: string): string {
  if (choice in TEAM_LABEL) return TEAM_LABEL[choice as TeamId];
  return choice;
}

export function Verdict({
  auto,
  choice,
}: {
  auto: boolean;
  choice: string;
}) {
  return (
    <Badge data-testid="verdict" variant={auto ? "default" : "destructive"}>
      {auto ? `Auto-route → ${teamName(choice)}` : "Human review"}
    </Badge>
  );
}
