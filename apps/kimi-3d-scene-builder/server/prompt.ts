import type { TurnRequest } from "../src/lib/types.ts";

export const SYSTEM_PROMPT = `You write one procedural three.js scene.

Return exactly one fenced \`\`\`js block. The fence contains only the body of function build(kit): statements, not a function declaration, not imports, not exports, not HTML.

You may use only:
- kit.THREE, kit.scene, kit.camera, kit.renderer
- kit.onFrame((dt, t) => { ... }) where dt and t are seconds
- kit.random(seed), which returns a function () => number in [0, 1)
- kit.setSky(topColor, bottomColor)
- kit.addControls(), which is a no-op because orbit controls are always on

Constraints:
- Under 400 lines.
- At most about 50k triangles.
- Procedural geometry and materials only. No texture URLs, no loaders, no network, no DOM.
- Do not reference window, document, fetch, WebSocket, Worker, or localStorage.

On an edit or a fix, return the full replacement body, not a patch.`;

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export function buildMessages(request: TurnRequest): ChatMessage[] {
  if (request.kind === "generate") {
    return [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: request.prompt },
    ];
  }
  const errorText =
    request.kind === "fix" && request.error
      ? `\n\nThe current code failed (${request.error.phase}${request.error.line ? `, line ${request.error.line}` : ""}): ${request.error.message}\nReturn the full replacement body with this error fixed.`
      : "";
  const verb = request.kind === "fix" ? "Fix" : "Edit";
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Current code:\n\`\`\`js\n${request.currentCode ?? ""}\n\`\`\`\n\n${verb}: ${request.prompt}${errorText}\n\nReturn the full replacement body of function build(kit) in one \`\`\`js fence.`,
    },
  ];
}
