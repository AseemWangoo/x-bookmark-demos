import { z } from "zod";

export const listFilesArgs = z.object({
  glob: z.string().min(1).max(200).optional(),
});

export const readFileArgs = z.object({
  path: z.string().min(1).max(500),
});

export const tagFileArgs = z.object({
  path: z.string().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(32)).min(1).max(8),
});

export const writeSummaryArgs = z.object({
  markdown: z.string().min(1).max(32_000),
});

export const runBody = z.object({
  rootId: z.enum(["fixture", "custom"]),
  customPath: z.string().min(1).max(2000).optional(),
});

export const filesQuery = z.object({
  rootId: z.enum(["fixture", "custom"]),
  customPath: z.string().min(1).max(2000).optional(),
  path: z.string().min(1).max(500).optional(),
});
