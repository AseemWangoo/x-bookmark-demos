import { createHash } from "node:crypto";

import { normalizeText } from "../src/lib/text";

export function textHash(text: string): string {
  return createHash("sha1").update(normalizeText(text)).digest("hex");
}

function hashUnit(text: string): number {
  const digest = createHash("sha256").update(normalizeText(text)).digest();
  const value = digest.readUInt32BE(0);
  return value / 0x1_0000_0000;
}

/**
 * Seeded latency with median ≈ 45 ms and a tail whose p95 sits near 300–420 ms.
 * Not a measurement of Sarvam. Mock mode waits this long so the meter moves.
 */
export function syntheticLatencyMs(text: string): number {
  const u = hashUnit(text);
  if (u < 0.5) return Math.round(18 + (u / 0.5) * 27);
  if (u < 0.95) return Math.round(45 + ((u - 0.5) / 0.45) * 175);
  return Math.round(300 + ((u - 0.95) / 0.05) * 120);
}
