export type DeskSelection =
  | { kind: "mock"; reason: string }
  | { kind: "live"; apiUrl: string }
  | { kind: "invalid"; reason: string };

export function selectDesk(input: {
  env: Record<string, string | undefined>;
  argv: readonly string[];
}): DeskSelection {
  if (input.env.MOCK === "1" || input.env.DESK_MODE === "mock") {
    return {
      kind: "mock",
      reason: "MOCK=1 or DESK_MODE=mock forces the simulated backend.",
    };
  }

  const liveRequested =
    input.argv.includes("--live") || input.env.DESK_MODE === "live";
  const apiUrl = input.env.LANGGRAPH_API_URL?.trim() ?? "";
  const hasKey = Boolean(
    input.env.ANTHROPIC_API_KEY ||
      input.env.OPENAI_API_KEY ||
      input.env.GOOGLE_API_KEY ||
      input.env.GEMINI_API_KEY,
  );

  if (liveRequested) {
    if (!apiUrl) {
      return {
        kind: "invalid",
        reason:
          "Live mode needs LANGGRAPH_API_URL (start it with bun run agent-server).",
      };
    }
    return { kind: "live", apiUrl };
  }

  if (apiUrl && hasKey) return { kind: "live", apiUrl };

  return {
    kind: "mock",
    reason: "No Agent Server URL plus model key. Using the simulated backend.",
  };
}

export const LIVE_SETUP = [
  "bun run agent-server",
  "LANGGRAPH_API_URL=http://127.0.0.1:2024 bun run dev -- --live",
] as const;
