import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export class SandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxError";
  }
}

function hasParentSegment(input: string): boolean {
  return input.split(/[\\/]/).some((part) => part === "..");
}

function staysInside(rootReal: string, candidate: string): boolean {
  const rel = path.relative(rootReal, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export async function confine(root: string, relativePath: string): Promise<string> {
  if (relativePath.includes("\0")) {
    throw new SandboxError("null bytes are refused");
  }
  const trimmed = relativePath.trim();
  if (!trimmed) throw new SandboxError("empty path");
  if (path.isAbsolute(trimmed) || /^[a-zA-Z]:[\\/]/.test(trimmed)) {
    throw new SandboxError("absolute paths are refused");
  }
  if (hasParentSegment(trimmed)) {
    throw new SandboxError("parent segments are refused");
  }

  const rootReal = await realpath(root);
  const lexical = path.resolve(rootReal, trimmed);
  if (!staysInside(rootReal, lexical)) {
    throw new SandboxError("path escapes the sandbox");
  }

  const rel = path.relative(rootReal, lexical);
  const parts = rel.split(path.sep).filter(Boolean);
  let cursor = rootReal;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    let info;
    try {
      info = await lstat(cursor);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return path.resolve(rootReal, rel);
      throw error;
    }
    if (info.isSymbolicLink()) {
      const linkReal = await realpath(cursor);
      if (!staysInside(rootReal, linkReal)) {
        throw new SandboxError("symlink escapes the sandbox");
      }
      cursor = linkReal;
    }
  }

  const finalReal = await realpath(cursor);
  if (!staysInside(rootReal, finalReal)) {
    throw new SandboxError("path escapes the sandbox");
  }
  return finalReal;
}
