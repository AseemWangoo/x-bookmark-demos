import { cp, mkdir, realpath, rm, stat } from "node:fs/promises";
import path from "node:path";

import type { RootId } from "../shared/types.ts";

const APP_ROOT = path.resolve(import.meta.dir, "..");

export const FIXTURE_POCKET = path.join(APP_ROOT, "shared/fixtures/pocket");

let ready: Promise<string> | null = null;

export function fixtureRoot(): Promise<string> {
  if (!ready) {
    ready = (async () => {
      const dest = path.join(APP_ROOT, ".runtime", "sample-pocket");
      await rm(dest, { recursive: true, force: true });
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(FIXTURE_POCKET, dest, { recursive: true });
      return dest;
    })();
  }
  return ready;
}

export async function resolveRoot(rootId: RootId, customPath: string | undefined): Promise<string> {
  if (rootId === "fixture") return fixtureRoot();
  if (rootId === "custom") {
    if (!customPath) throw new Error("Pick a folder path.");
    if (!path.isAbsolute(customPath)) throw new Error("Folder path must be absolute.");
    const info = await stat(customPath);
    if (!info.isDirectory()) throw new Error("Folder path is not a directory.");
    return realpath(customPath);
  }
  const neverId: never = rootId;
  throw new Error(`unknown root ${neverId}`);
}
