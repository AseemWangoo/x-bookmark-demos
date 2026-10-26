export const USER_CODE_LINE_OFFSET = 1;

type UserBuild = (
  kit: object,
  window: undefined,
  document: undefined,
  globalThis: undefined,
  self: undefined,
  parent: undefined,
  top: undefined,
  opener: undefined,
) => void;

export function compileUserCode(code: string): UserBuild {
  const source = `'use strict';\n${code}`;
  return new Function(
    "kit",
    "window",
    "document",
    "globalThis",
    "self",
    "parent",
    "top",
    "opener",
    source,
  ) as UserBuild;
}

export function executeBuild(code: string, kit: object): void {
  const build = compileUserCode(code);
  build(kit, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
}

export function userLineFromError(error: unknown): number | undefined {
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  const match = stack.match(/<anonymous>:(\d+):\d+/) ?? stack.match(/:(\d+):\d+/);
  if (!match?.[1]) return undefined;
  const line = Number(match[1]) - USER_CODE_LINE_OFFSET;
  return line > 0 ? line : undefined;
}
