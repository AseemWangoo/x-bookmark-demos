import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { chromiumPresent, decideMode, nodeSupportsPomerado, type ModeProbes } from "./env.ts";

function probes(overrides: Partial<ModeProbes> = {}): ModeProbes {
  return {
    nodeVersion: "v24.21.0",
    chromium: true,
    minted: true,
    portalUrlMatches: true,
    recordedAt: "2026-10-28T12:00:00.000Z",
    pomeradoVersion: "0.4.0-canary.390",
    vercel: false,
    forced: null,
    openaiKeyPresent: false,
    ...overrides,
  };
}

test("node range", () => {
  expect(nodeSupportsPomerado("v24.20.0")).toBe(false);
  expect(nodeSupportsPomerado("v24.21.0")).toBe(true);
  expect(nodeSupportsPomerado("v24.22.1")).toBe(true);
  expect(nodeSupportsPomerado("v25.0.0")).toBe(false);
  expect(nodeSupportsPomerado("v20.19.0")).toBe(false);
});

test("mode follows node, chromium, mint, and vercel", () => {
  expect(decideMode(probes()).mode).toBe("local");
  expect(decideMode(probes({ nodeVersion: "v24.20.0" })).mode).toBe("replay");
  expect(decideMode(probes({ nodeVersion: "v24.20.0" })).reason).toContain("v24.20.0");
  expect(decideMode(probes({ nodeVersion: "v25.0.0" })).mode).toBe("replay");
  expect(decideMode(probes({ chromium: false })).reason).toContain("Chromium");
  const missing = decideMode(probes({ minted: false, portalUrlMatches: false }));
  expect(missing.mode).toBe("replay");
  expect(missing.synthetic).toBe(true);
  expect(missing.reason).toBe("Replay: hand-written, not Pomerado output");
  const vercel = decideMode(probes({ vercel: true }));
  expect(vercel.mode).toBe("replay");
  expect(vercel.reason).toBe("Replay (recorded 2026-10-28)");
  expect(vercel.portalUrl).toBeNull();
});

test("OPENAI_API_KEY does not change the mode", () => {
  const withoutKey = decideMode(probes({ openaiKeyPresent: false }));
  const withKey = decideMode(probes({ openaiKeyPresent: true, nodeVersion: "v24.20.0" }));
  const withKeyLocal = decideMode(probes({ openaiKeyPresent: true }));
  expect(withKeyLocal).toEqual(withoutKey);
  expect(withKey.mode).toBe("replay");
  expect(decideMode(probes({ openaiKeyPresent: true, nodeVersion: "v24.20.0" })).mode).toBe(
    decideMode(probes({ openaiKeyPresent: false, nodeVersion: "v24.20.0" })).mode,
  );
});

test("chromium probe looks for a browser directory", () => {
  const root = mkdtempSync(join(tmpdir(), "pw-"));
  expect(chromiumPresent(root)).toBe(false);
  mkdirSync(join(root, "chromium-1200"));
  expect(chromiumPresent(root)).toBe(true);
});
