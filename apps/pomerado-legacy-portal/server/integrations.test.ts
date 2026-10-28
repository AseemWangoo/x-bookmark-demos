import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { portalUrl } from "./env.ts";

const root = join(import.meta.dir, "../integrations");
const expected: Record<string, "read" | "write"> = {
  list_invoices: "read",
  list_vendors: "read",
  add_vendor: "write",
};

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

test.skipIf(!existsSync(root))("minted integrations match the portal and contain no machine paths", () => {
  for (const [name, effect] of Object.entries(expected)) {
    const deployment = JSON.parse(readFileSync(join(root, name, "deployment.json"), "utf8")) as {
      request: { url: string; effect: string };
    };
    expect(deployment.request.url.startsWith(portalUrl())).toBe(true);
    expect(deployment.request.effect).toBe(effect);
  }
  for (const file of walk(root)) {
    const text = readFileSync(file, "utf8");
    expect(text.includes("sk-")).toBe(false);
    expect(text.includes("/home/")).toBe(false);
    expect(text.includes("/Users/")).toBe(false);
    expect(file.endsWith("mcp.mjs")).toBe(false);
    expect(file.endsWith(`${join("mcp.json")}`)).toBe(false);
  }
});
