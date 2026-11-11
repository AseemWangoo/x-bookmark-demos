import type { PortRequest } from "../shared/port.ts";

export const PORT_INSTRUCTIONS = [
  "Return a single self-contained HTML document and nothing else.",
  "The document must start with <!DOCTYPE html> and include all CSS and JavaScript inline.",
  "Draw the ported program on a <canvas> (canvas plus minimal DOM chrome is fine).",
  "The result must be playable with no further setup and must not require any external network or CDN.",
  "Do not wrap the document in a markdown fence.",
].join(" ");

export function buildPrompt(request: PortRequest): string {
  const language = request.language ? `Language: ${request.language}\n` : "";
  return `${language}Port this legacy snippet into that HTML canvas app.\n\n${request.source}`;
}
