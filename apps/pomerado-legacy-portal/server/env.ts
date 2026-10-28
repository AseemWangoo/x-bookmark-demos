import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type RuntimeMode = "local" | "replay";

export interface ModeReport {
  mode: RuntimeMode;
  reason: string;
  pomeradoVersion: string | null;
  node: string | null;
  chromium: boolean;
  minted: boolean;
  synthetic: boolean;
  recordedAt: string | null;
  portalUrl: string | null;
  secondsPerStep: number;
}

export interface ModeProbes {
  nodeVersion: string | null;
  chromium: boolean;
  minted: boolean;
  portalUrlMatches: boolean;
  recordedAt: string | null;
  pomeradoVersion: string | null;
  vercel: boolean;
  forced: RuntimeMode | null;
  /** Accepted and ignored. A key never selects local or replay. */
  openaiKeyPresent: boolean;
}

export function portalPort(): number {
  const parsed = Number(process.env.PORTAL_PORT ?? "4517");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4517;
}

export function portalUrl(): string {
  const explicit = process.env.PORTAL_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  return `http://127.0.0.1:${portalPort()}`;
}

export function portalCreds(): { username: string; password: string } {
  return {
    username: process.env.PORTAL_USER ?? "clerk",
    password: process.env.PORTAL_PASS ?? "legacy123",
  };
}

export function portalToday(): string {
  return process.env.PORTAL_TODAY ?? "2026-10-28";
}

export function secondsPerStep(): number {
  const parsed = Number(process.env.SECONDS_PER_STEP ?? "8");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

export function nodeBin(): string {
  return process.env.NODE_BIN ?? "node";
}

export function parseNode(version: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Node >=24.21.0 and <25, matching Pomerado's engines field. */
export function nodeSupportsPomerado(version: string | null): boolean {
  if (!version) return false;
  const parsed = parseNode(version);
  if (!parsed) return false;
  const [major, minor, patch] = parsed;
  if (major !== 24) return false;
  if (minor > 21) return true;
  if (minor < 21) return false;
  return patch >= 0;
}

export function chromiumPresent(root?: string): boolean {
  const dir =
    root ??
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    join(homedir(), ".cache", "ms-playwright");
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  return entries.some((name) => /chromium|chrome-headless-shell|headless_shell/i.test(name));
}

export function readPomeradoVersion(packageJsonPath: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

const INTEGRATIONS = ["list_invoices", "list_vendors", "add_vendor"] as const;

export function inspectIntegrations(
  root: string,
  expectedUrl: string,
): { minted: boolean; portalUrlMatches: boolean } {
  const files = INTEGRATIONS.map((name) => join(root, name, "deployment.json"));
  if (!files.every((file) => existsSync(file))) return { minted: false, portalUrlMatches: false };
  const portalUrlMatches = files.every((file) => {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as {
        request?: { url?: unknown };
      };
      return typeof parsed.request?.url === "string" && parsed.request.url.startsWith(expectedUrl);
    } catch {
      return false;
    }
  });
  return { minted: true, portalUrlMatches };
}

export function decideMode(probes: ModeProbes): ModeReport {
  void probes.openaiKeyPresent;
  const base = {
    pomeradoVersion: probes.pomeradoVersion,
    node: probes.nodeVersion,
    chromium: probes.chromium,
    minted: probes.minted,
    synthetic: !probes.minted,
    recordedAt: probes.recordedAt,
    portalUrl: probes.vercel ? null : portalUrl(),
    secondsPerStep: secondsPerStep(),
  };

  if (probes.forced === "replay") {
    return { ...base, mode: "replay", reason: replayReason(probes) };
  }
  if (probes.forced === "local") {
    return { ...base, mode: "local", reason: "MODE=local" };
  }
  if (probes.vercel || !canRunLocal(probes)) {
    return { ...base, mode: "replay", reason: replayReason(probes) };
  }
  return { ...base, mode: "local", reason: "Measured runs against the bundled portal" };
}

function canRunLocal(probes: ModeProbes): boolean {
  return (
    probes.minted &&
    probes.portalUrlMatches &&
    probes.chromium &&
    nodeSupportsPomerado(probes.nodeVersion)
  );
}

function replayReason(probes: ModeProbes): string {
  if (!probes.minted) return "Replay: hand-written, not Pomerado output";
  if (probes.vercel) {
    const date = probes.recordedAt?.slice(0, 10);
    return date ? `Replay (recorded ${date})` : "Replay (recorded)";
  }
  if (!nodeSupportsPomerado(probes.nodeVersion)) {
    const found = probes.nodeVersion ?? "not found";
    return `Replay: Node ${found} found, need >=24.21.0 <25`;
  }
  if (!probes.chromium) return "Replay: Playwright Chromium is not installed";
  if (!probes.portalUrlMatches) return "Replay: minted portal URL does not match PORTAL_URL";
  return "Replay";
}

export function readNodeVersion(bin = nodeBin()): Promise<string | null> {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(bin, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code === 0 ? output.trim() : null));
  });
}

export async function detectMode(appRoot: string, recordedAt: string | null = null): Promise<ModeReport> {
  const forced = process.env.MODE === "local" || process.env.MODE === "replay" ? process.env.MODE : null;
  const integrations = inspectIntegrations(join(appRoot, "integrations"), portalUrl());
  const probes: ModeProbes = {
    nodeVersion: await readNodeVersion(),
    chromium: chromiumPresent(),
    minted: integrations.minted,
    portalUrlMatches: integrations.portalUrlMatches,
    recordedAt,
    pomeradoVersion: readPomeradoVersion(join(appRoot, "node_modules", "pomerado", "package.json")),
    vercel: process.env.VERCEL === "1",
    forced,
    openaiKeyPresent: Boolean(process.env.OPENAI_API_KEY),
  };
  return decideMode(probes);
}
