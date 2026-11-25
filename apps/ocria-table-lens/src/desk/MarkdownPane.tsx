import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils.ts";
import { reportCopy, supportsInvokerCommands, writeClipboard } from "../lib/commands.ts";
import { markdownSchema } from "../lib/sanitize.ts";

type MarkdownPaneProps = {
  markdown: string;
  label: string;
};

function previewMarkdown(markdown: string): string {
  return markdown
    .replaceAll("<page_header>", "<page-header>")
    .replaceAll("</page_header>", "</page-header>")
    .replaceAll("<page_footer>", "<page-footer>")
    .replaceAll("</page_footer>", "</page-footer>")
    .replaceAll("<page_number>", "<page-number>")
    .replaceAll("</page_number>", "</page-number>")
    .replaceAll("<watermark>", "<page-watermark>")
    .replaceAll("</watermark>", "</page-watermark>");
}

export function MarkdownPane({ markdown, label }: MarkdownPaneProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const copying = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const supports = supportsInvokerCommands();

  async function copyNow(text: string) {
    if (copying.current) return;
    copying.current = true;
    const ok = await writeClipboard(text);
    if (buttonRef.current && tipRef.current) reportCopy(buttonRef.current, tipRef.current, ok, timer);
    setMessage(ok ? "Markdown copied" : "Copy failed");
    window.setTimeout(() => {
      copying.current = false;
    }, 0);
  }

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !supports) return;
    button.setAttribute("command", "--copy");
    button.setAttribute("commandfor", "markdown-source");
    const onCommand = (event: Event) => {
      const commandEvent = event as Event & { command?: string; source?: EventTarget | null };
      if (commandEvent.command !== "--copy" || commandEvent.source !== button) return;
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      void copyNow(target.value);
    };
    document.addEventListener("command", onCommand, true);
    return () => document.removeEventListener("command", onCommand, true);
  }, [supports]);

  return (
    <section aria-labelledby="markdown-heading" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="markdown-heading" className="text-base font-medium">
          Markdown
        </h2>
        <span className="copy-control">
          <button
            ref={buttonRef}
            type="button"
            className={cn(buttonVariants({ variant: "outline" }))}
            data-testid="copy-markdown"
            onClick={() => {
              const source = document.getElementById("markdown-source");
              if (!(source instanceof HTMLTextAreaElement)) return;
              void copyNow(source.value);
            }}
          >
            Copy Markdown
          </button>
          <span ref={tipRef} className="copy-tip" role="status" />
        </span>
      </div>
      {message ? <p className="text-sm font-medium">{message}</p> : null}
      <p className="text-sm text-muted-foreground">{label}</p>
      <textarea id="markdown-source" className="clip-status" readOnly value={markdown} aria-label="Markdown source" />
      <ScrollArea className="h-[32rem] rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="markdown px-4 py-3" data-testid="markdown-pane">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}>
            {previewMarkdown(markdown)}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </section>
  );
}
