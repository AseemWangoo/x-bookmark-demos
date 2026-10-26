export const MAX_CODE_BYTES = 64 * 1024;

export type GuardResult =
  | { ok: true }
  | { ok: false; token: string; message: string };

type Rule = {
  token: string;
  test: (code: string) => boolean;
};

const RULES: Rule[] = [
  { token: "import", test: (code) => /(^|\n)\s*import\s|\bimport\s*\(/.test(code) },
  { token: "export", test: (code) => /(^|\n)\s*export\s/.test(code) },
  { token: "fetch(", test: (code) => code.includes("fetch(") },
  { token: "XMLHttpRequest", test: (code) => code.includes("XMLHttpRequest") },
  { token: "WebSocket", test: (code) => code.includes("WebSocket") },
  { token: "EventSource", test: (code) => code.includes("EventSource") },
  { token: "importScripts", test: (code) => code.includes("importScripts") },
  { token: "new Worker", test: (code) => /new\s+Worker\b/.test(code) },
  { token: "document.cookie", test: (code) => code.includes("document.cookie") },
  { token: "localStorage", test: (code) => code.includes("localStorage") },
  { token: "eval(", test: (code) => code.includes("eval(") },
];

export function guardCode(code: string): GuardResult {
  const bytes = new TextEncoder().encode(code).length;
  if (bytes > MAX_CODE_BYTES) {
    return blocked(
      `${bytes} bytes`,
      `Blocked: code is ${bytes} bytes, over the 64 KB limit.`,
    );
  }
  for (const rule of RULES) {
    if (!rule.test(code)) continue;
    return blocked(
      rule.token,
      `Blocked: code contains "${rule.token}". Comments and strings are not excluded, so this can be a false positive.`,
    );
  }
  return { ok: true };
}

function blocked(token: string, message: string): GuardResult {
  return { ok: false, token, message };
}
