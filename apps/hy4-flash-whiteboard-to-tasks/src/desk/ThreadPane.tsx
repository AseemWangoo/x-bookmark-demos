import { useEffect } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { Source } from "../../shared/schema.ts";

type ThreadPaneProps = {
  text: string;
  source: Source | null;
  onText: (value: string) => void;
};

export function ThreadPane({ text, source, onText }: ThreadPaneProps) {
  const lines = text.length ? text.split("\n") : [];
  const start = source?.type === "text" ? source.startLine : null;
  const end = source?.type === "text" ? source.endLine : null;

  useEffect(() => {
    if (start == null) return;
    document.getElementById(`passage-line-${start}`)?.scrollIntoView({ block: "center" });
  }, [start, end, text]);

  return (
    <section className="flex min-h-0 flex-col gap-2" data-testid="thread-pane">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Pasted doc / thread</h2>
        <p className="text-xs text-muted-foreground">Sample text is hand-authored, not model output.</p>
      </div>
      <Textarea
        value={text}
        onChange={(event) => onText(event.target.value)}
        placeholder="Paste a doc, RFC, or chat thread"
        className="field-sizing-fixed h-[92px] shrink-0 resize-none font-mono text-xs"
        aria-label="Pasted document or thread"
      />
      <div
        className="min-h-0 flex-1 overflow-auto rounded-lg bg-card px-2 py-1.5 font-mono text-xs ring-1 ring-foreground/10"
        data-testid="passage"
      >
        {lines.length === 0 ? (
          <p className="px-2 py-3 text-muted-foreground">The passage highlight shows up here.</p>
        ) : (
          <ol aria-label="Numbered thread">
            {lines.map((line, index) => {
              const number = index + 1;
              const marked = start != null && end != null && number >= start && number <= end;
              return (
                <li
                  key={number}
                  id={`passage-line-${number}`}
                  className="passage-line"
                  data-source={marked ? "true" : "false"}
                >
                  <span className="text-right text-muted-foreground tabular-nums">{number}</span>
                  <span>
                    {marked && number === start ? (
                      <span className="mr-1 rounded bg-[#9f1239] px-1 py-px text-[10px] font-semibold text-white no-underline">
                        Source
                      </span>
                    ) : null}
                    {marked ? <mark>{line || " "}</mark> : line || " "}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
