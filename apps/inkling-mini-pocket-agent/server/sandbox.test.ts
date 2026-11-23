import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { SUMMARY_FILENAME } from "../shared/copy.ts";
import { TOOL_NAMES } from "../shared/types.ts";
import { confine, SandboxError } from "./sandbox.ts";
import { executeTool } from "./tools.ts";

async function pocket(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "pocket-sandbox-"));
  await writeFile(path.join(root, "note.md"), "hello pocket\n");
  return root;
}

describe("sandbox", () => {
  test("refuses parent segments, absolute paths, and escaping symlinks", async () => {
    const root = await pocket();
    await expect(confine(root, "../etc/passwd")).rejects.toBeInstanceOf(SandboxError);
    await expect(confine(root, "/etc/passwd")).rejects.toBeInstanceOf(SandboxError);
    await expect(confine(root, "note.md/../../etc/passwd")).rejects.toBeInstanceOf(SandboxError);
    await symlink("/etc/passwd", path.join(root, "escape"));
    await expect(confine(root, "escape")).rejects.toThrow(/symlink/);
    await mkdir(path.join(root, "nested"));
    await symlink("/tmp", path.join(root, "nested", "out"));
    await expect(confine(root, "nested/out/secret")).rejects.toThrow(/symlink/);

    const inside = await confine(root, "note.md");
    expect(inside).toBe(path.join(root, "note.md"));
  });

  test("tools stay inside the root and have no delete", async () => {
    const root = await pocket();
    expect([...TOOL_NAMES]).toEqual(["list_files", "read_file", "tag_file", "write_summary"]);
    expect(TOOL_NAMES).not.toContain("delete");

    const escaped = await executeTool(root, "read_file", { path: "/etc/passwd" });
    expect(escaped.ok).toBe(false);
    expect(escaped.modelText).not.toContain("root:");

    const parent = await executeTool(root, "read_file", { path: "../note.md" });
    expect(parent.ok).toBe(false);

    const tagged = await executeTool(root, "tag_file", { path: "note.md", tags: ["Note"] });
    expect(tagged.ok).toBe(true);
    const original = await Bun.file(path.join(root, "note.md")).text();
    expect(original).toBe("hello pocket\n");

    const summary = await executeTool(root, "write_summary", { markdown: "# Done\n" });
    expect(summary.ok).toBe(true);
    expect(summary.summary?.path).toBe(SUMMARY_FILENAME);
    const written = await Bun.file(path.join(root, SUMMARY_FILENAME)).text();
    expect(written).toContain("# Done");
    expect(await Bun.file(path.join(root, "other.md")).exists()).toBe(false);
  });
});
