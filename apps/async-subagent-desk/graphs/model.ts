/** Model id string accepted by createDeepAgent. Override with DEEP_AGENT_MODEL. */
export function resolveModel(): string {
  const explicit = process.env.DEEP_AGENT_MODEL?.trim();
  if (explicit) return explicit;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic:claude-sonnet-5";
  if (process.env.OPENAI_API_KEY) return "openai:gpt-5.5";
  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
    return "google:gemini-3.6-flash";
  }
  return "anthropic:claude-sonnet-5";
}
