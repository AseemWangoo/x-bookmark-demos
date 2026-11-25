import { SAMPLE_LABEL } from "../shared/copy.ts";
import type { DeskSource, TokenUsage, TranscribeResult } from "../shared/types.ts";
import { stripMarkdownFence } from "./markdown.ts";
import { parseMarkdownTables } from "./tables.ts";

export function buildResult(input: {
  rawMarkdown: string;
  wallMs: number;
  doneReason: string | null;
  source: DeskSource;
  model: string;
  usage?: TokenUsage;
  warning: string | null;
  label: string;
}): TranscribeResult {
  const markdown = stripMarkdownFence(input.rawMarkdown);
  return {
    markdown,
    tables: parseMarkdownTables(markdown),
    wallMs: input.wallMs,
    doneReason: input.doneReason,
    source: input.source,
    model: input.model,
    usage: input.usage,
    warning: input.warning,
    label: input.source === "mock" ? SAMPLE_LABEL : input.label,
  };
}
