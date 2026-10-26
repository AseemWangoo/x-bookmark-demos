import { expect, test } from "bun:test";
import { runnableCodes } from "../fixtures/mock-scenes.ts";
import { guardCode } from "../src/sandbox/guard.ts";

test("guard blocks network and module tokens and oversized code", () => {
  expect(guardCode("const x = fetch('/no');").ok).toBe(false);
  expect(guardCode("import * as THREE from 'three';\nkit.scene;").ok).toBe(false);
  expect(guardCode("const socket = new WebSocket('wss://example');").ok).toBe(false);
  expect(guardCode("localStorage.setItem('a', 'b');").ok).toBe(false);
  const huge = guardCode(`${"const x = 1;\n".repeat(6000)}kit.scene;`);
  expect(huge.ok).toBe(false);
  if (!huge.ok) expect(huge.message).toContain("64 KB");
});

test("guard allows every mock scene", () => {
  for (const code of runnableCodes()) {
    const result = guardCode(code);
    expect(result).toEqual({ ok: true });
  }
});
