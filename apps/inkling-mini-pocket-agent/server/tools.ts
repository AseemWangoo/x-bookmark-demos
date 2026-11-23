import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { SUMMARY_FILENAME, TAGS_RELATIVE } from "../shared/copy.ts";
import { TOOL_NAMES, type FileKind, type PocketFile, type ToolName } from "../shared/types.ts";
import { listFilesArgs, readFileArgs, tagFileArgs, writeSummaryArgs } from "./schema.ts";
import { SandboxError, confine } from "./sandbox.ts";

export { TOOL_NAMES };

const TEXT_CAP = 64 * 1024;
const IMAGE_CAP = 2 * 1024 * 1024;

export type ToolImage = {
  mime: "image/png" | "image/jpeg" | "image/webp";
  base64: string;
};

export type ToolOutcome = {
  ok: boolean;
  excerpt: string;
  modelText: string;
  highlightPath: string | null;
  summary: { path: string; markdown: string } | null;
  image?: ToolImage;
};

function kindFor(rel: string): FileKind {
  if (rel === SUMMARY_FILENAME) return "summary";
  const lower = rel.toLowerCase();
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
    return "receipt";
  }
  if (lower.includes("receipt")) return "receipt";
  if (lower.endsWith(".md") || lower.endsWith(".txt")) return "note";
  return "other";
}

function mimeFor(rel: string): string {
  const lower = rel.toLowerCase();
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function imageMime(rel: string): ToolImage["mime"] | null {
  const mime = mimeFor(rel);
  if (mime === "image/png" || mime === "image/jpeg" || mime === "image/webp") return mime;
  return null;
}

function matchGlob(rel: string, glob: string): boolean {
  let pattern = "";
  let index = 0;
  while (index < glob.length) {
    if (glob.startsWith("**", index)) {
      pattern += ".*";
      index += 2;
      continue;
    }
    const char = glob[index] ?? "";
    if (char === "*") pattern += "[^/]*";
    else if ("\\^$+?.()|{}[]".includes(char)) pattern += `\\${char}`;
    else pattern += char;
    index += 1;
  }
  return new RegExp(`^${pattern}$`).test(rel);
}

async function readTagMap(root: string): Promise<Record<string, string[]>> {
  try {
    const file = await confine(root, TAGS_RELATIVE);
    const raw = await readFile(file, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const tags: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      tags[key] = value.filter((tag): tag is string => typeof tag === "string");
    }
    return tags;
  } catch {
    return {};
  }
}

async function walkFiles(root: string, dir: string, acc: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".pocket" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs);
    if (entry.isSymbolicLink()) {
      try {
        const real = await confine(root, rel);
        const info = await stat(real);
        if (info.isFile()) acc.push(rel);
      } catch (error) {
        if (error instanceof SandboxError) continue;
        throw error;
      }
      continue;
    }
    if (entry.isDirectory()) {
      await walkFiles(root, abs, acc);
      continue;
    }
    if (entry.isFile()) acc.push(rel);
  }
}

export async function listPocket(root: string, glob?: string): Promise<PocketFile[]> {
  const rels: string[] = [];
  await walkFiles(root, root, rels);
  const tags = await readTagMap(root);
  const files: PocketFile[] = [];
  for (const rel of rels.sort()) {
    if (glob && !matchGlob(rel, glob)) continue;
    const abs = await confine(root, rel);
    const info = await stat(abs);
    files.push({
      path: rel,
      name: path.basename(rel),
      kind: kindFor(rel),
      mime: mimeFor(rel),
      size: info.size,
      tags: tags[rel] ?? [],
    });
  }
  return files;
}

function failure(message: string, highlightPath: string | null = null): ToolOutcome {
  return {
    ok: false,
    excerpt: message,
    modelText: JSON.stringify({ error: message }),
    highlightPath,
    summary: null,
  };
}

async function listFilesTool(root: string, args: unknown): Promise<ToolOutcome> {
  const parsed = listFilesArgs.safeParse(args ?? {});
  if (!parsed.success) return failure("list_files arguments were rejected");
  const files = await listPocket(root, parsed.data.glob);
  const brief = files.map((file) => ({
    path: file.path,
    mime: file.mime,
    size: file.size,
    tags: file.tags,
  }));
  return {
    ok: true,
    excerpt: `${files.length} file${files.length === 1 ? "" : "s"}`,
    modelText: JSON.stringify(brief),
    highlightPath: null,
    summary: null,
  };
}

async function readFileTool(root: string, args: unknown): Promise<ToolOutcome> {
  const parsed = readFileArgs.safeParse(args);
  if (!parsed.success) return failure("read_file arguments were rejected");
  let abs: string;
  try {
    abs = await confine(root, parsed.data.path);
  } catch (error) {
    const message = error instanceof SandboxError ? error.message : "read refused";
    return failure(message);
  }
  const info = await stat(abs).catch(() => null);
  if (!info?.isFile()) return failure("not a file", parsed.data.path);
  const image = imageMime(parsed.data.path);
  if (image) {
    if (info.size > IMAGE_CAP) return failure("image exceeds 2 MB", parsed.data.path);
    const bytes = await readFile(abs);
    return {
      ok: true,
      excerpt: `${image} · ${info.size} bytes`,
      modelText: `Image file ${parsed.data.path} (${image}, ${info.size} bytes).`,
      highlightPath: parsed.data.path,
      summary: null,
      image: { mime: image, base64: bytes.toString("base64") },
    };
  }
  const bytes = await readFile(abs);
  const truncated = bytes.byteLength > TEXT_CAP;
  const text = bytes.subarray(0, TEXT_CAP).toString("utf8");
  const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 180);
  return {
    ok: true,
    excerpt: truncated ? `${excerpt} …` : excerpt || "(empty)",
    modelText: truncated ? `${text}\n\n[truncated]` : text,
    highlightPath: parsed.data.path,
    summary: null,
  };
}

async function tagFileTool(root: string, args: unknown): Promise<ToolOutcome> {
  const parsed = tagFileArgs.safeParse(args);
  if (!parsed.success) return failure("tag_file arguments were rejected");
  try {
    const abs = await confine(root, parsed.data.path);
    const info = await stat(abs);
    if (!info.isFile()) return failure("not a file", parsed.data.path);
  } catch (error) {
    const message = error instanceof SandboxError ? error.message : "tag refused";
    return failure(message);
  }
  const tags = [...new Set(parsed.data.tags.map((tag) => tag.toLowerCase()))];
  const map = await readTagMap(root);
  map[parsed.data.path] = tags;
  const sidecar = await confine(root, TAGS_RELATIVE);
  await mkdir(path.dirname(sidecar), { recursive: true });
  await writeFile(sidecar, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  return {
    ok: true,
    excerpt: `tagged ${parsed.data.path}: ${tags.join(", ")}`,
    modelText: JSON.stringify({ path: parsed.data.path, tags }),
    highlightPath: parsed.data.path,
    summary: null,
  };
}

async function writeSummaryTool(root: string, args: unknown): Promise<ToolOutcome> {
  const parsed = writeSummaryArgs.safeParse(args);
  if (!parsed.success) return failure("write_summary arguments were rejected");
  const abs = await confine(root, SUMMARY_FILENAME);
  if (path.basename(abs) !== SUMMARY_FILENAME) {
    return failure("write_summary can only write pocket-summary.md");
  }
  await writeFile(abs, parsed.data.markdown.endsWith("\n") ? parsed.data.markdown : `${parsed.data.markdown}\n`, "utf8");
  return {
    ok: true,
    excerpt: `wrote ${SUMMARY_FILENAME}`,
    modelText: JSON.stringify({ path: SUMMARY_FILENAME, bytes: parsed.data.markdown.length }),
    highlightPath: SUMMARY_FILENAME,
    summary: { path: SUMMARY_FILENAME, markdown: parsed.data.markdown },
  };
}

export async function executeTool(root: string, name: ToolName, args: unknown): Promise<ToolOutcome> {
  switch (name) {
    case "list_files":
      return listFilesTool(root, args);
    case "read_file":
      return readFileTool(root, args);
    case "tag_file":
      return tagFileTool(root, args);
    case "write_summary":
      return writeSummaryTool(root, args);
    default: {
      const neverName: never = name;
      return failure(`unknown tool ${neverName}`);
    }
  }
}

export function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}
