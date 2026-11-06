import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { streamChat, type ServerEvent } from "@/lib/api";
import { isSubmitEnter } from "@/lib/ime";
import { PRESETS, SIMULATED_BANNER } from "../../shared/desk.ts";

type ToolChip = {
  name: string;
  result: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ToolChip[];
  failed?: boolean;
};

export function ChatPane({
  simulated,
  onActivity,
}: {
  simulated: boolean;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const threadId = useRef<string | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setBusy(true);
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: message, tools: [] },
      { id: assistantId, role: "assistant", text: "", tools: [] },
    ]);
    const apply = (updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? updater(item) : item)),
      );
    };
    try {
      await streamChat({ message, threadId: threadId.current }, (event) => {
        if (event.type === "meta") threadId.current = event.threadId;
        onServerEvent(event, apply);
        if (event.type === "tool") onActivity();
      });
      onActivity();
      endRef.current?.scrollIntoView({ block: "end" });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Chat failed.";
      apply((item) => ({ ...item, failed: true, text: item.text || text }));
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="chat-heading">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
        <h2 id="chat-heading" tabIndex={-1} className="text-base font-medium">
          Lead agent
        </h2>
        <p className="text-xs text-muted-foreground">
          It returns after launch. It does not poll.
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-4">
        <ol className="flex flex-col gap-3 py-4" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Start a research task, a code task, or both. Then ask something else before they finish.
            </li>
          ) : null}
          {messages.map((message) => (
            <li
              key={message.id}
              className={
                message.role === "user"
                  ? "ms-8 rounded-lg bg-muted px-3 py-2 text-sm"
                  : "me-8 rounded-lg ring-1 ring-foreground/10 px-3 py-2 text-sm"
              }
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {message.role === "user" ? "You" : "Lead agent"}
              </p>
              {message.tools.length > 0 ? (
                <ul className="mb-2 flex flex-col gap-1">
                  {message.tools.map((tool, index) => (
                    <li
                      key={`${tool.name}-${index}`}
                      className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                      data-testid="tool-chip"
                    >
                      <span className="font-semibold">{tool.name}</span>
                      <span className="mt-0.5 block whitespace-pre-wrap text-muted-foreground">
                        {tool.result}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="whitespace-pre-wrap">
                {message.text || (busy ? "…" : "")}
              </p>
              {message.role === "assistant" &&
              simulated &&
              !message.text.includes(SIMULATED_BANNER) ? (
                <p className="mt-2 text-xs text-muted-foreground">{SIMULATED_BANNER}</p>
              ) : null}
            </li>
          ))}
          <div ref={endRef} />
        </ol>
      </ScrollArea>
      <div className="border-t px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Seeded prompts">
          {PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              className="min-h-11"
              data-testid={`preset-${preset.id}`}
              disabled={busy}
              onClick={() => void send(preset.message)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <label htmlFor="composer" className="mb-1 block text-sm font-medium">
            Message the lead agent
          </label>
          <Textarea
            id="composer"
            data-testid="composer"
            value={draft}
            placeholder="Ask something unrelated while a task is running"
            className="min-h-16 text-base"
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (!isSubmitEnter(event)) return;
              event.preventDefault();
              void send(draft);
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Enter sends. Shift+Enter adds a line.
            </p>
            <Button type="submit" className="min-h-11" data-testid="send" disabled={busy || !draft.trim()}>
              {busy ? "Sending" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function onServerEvent(
  event: ServerEvent,
  apply: (updater: (message: ChatMessage) => ChatMessage) => void,
): void {
  switch (event.type) {
    case "token":
      apply((message) => ({ ...message, text: message.text + event.text }));
      return;
    case "tool":
      apply((message) => ({
        ...message,
        tools: [...message.tools, { name: event.name, result: event.result }],
      }));
      return;
    case "meta":
      return;
    case "done":
      return;
    case "error":
      apply((message) => ({
        ...message,
        failed: true,
        text: message.text || event.message,
      }));
      toast.error(event.message);
      return;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
