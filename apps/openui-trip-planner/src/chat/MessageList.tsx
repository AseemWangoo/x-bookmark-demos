import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookingContext } from "@/genui/booking.tsx";
import { formatMoney } from "@/genui/components/format.ts";
import { currencyFor } from "@/genui/fixtures/generic.ts";
import { library } from "@/genui/library.tsx";
import { Renderer, type LibraryActionEvent } from "@openuidev/react-lang";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SUGGESTIONS } from "./suggestions.ts";
import type { ChatMessage } from "./types.ts";

function handleAction(
  event: LibraryActionEvent<typeof library>,
  onBooked: () => void,
) {
  switch (event.type) {
    case "BookTrip": {
      onBooked();
      toast.success("Booked (mock)", {
        description: `${event.params.city} · ${event.params.days} days · ${formatMoney(event.params.total, currencyFor(event.params.city))}`,
      });
      return;
    }
    case "continue_conversation":
    case "open_url":
    case "custom":
      return;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}

function AssistantTurn({
  message,
  showRaw,
}: {
  message: ChatMessage;
  showRaw: boolean;
}) {
  const [booked, setBooked] = useState(false);
  const bookedRef = useRef(false);

  const rendered = message.content ? (
    <BookingContext.Provider value={{ booked }}>
      <Renderer
        response={message.content}
        library={library}
        isStreaming={message.streaming}
        onAction={(event) => {
          if (event.type === "BookTrip" && bookedRef.current) return;
          handleAction(event, () => {
            bookedRef.current = true;
            setBooked(true);
          });
        }}
        onError={() => {
          // Streaming programs are incomplete on purpose. The fixture test guards the final shape.
        }}
      />
    </BookingContext.Provider>
  ) : (
    <p className="text-sm text-muted-foreground">Composing the plan…</p>
  );

  const raw = (
    <pre className="max-h-[36rem] overflow-auto rounded-xl bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
      {message.content || " "}
    </pre>
  );

  return (
    <div className="space-y-2">
      {message.streaming ? (
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Streaming
        </p>
      ) : null}
      {showRaw ? (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-muted-foreground">OpenUI Lang</p>
            {raw}
          </div>
          <div className="min-w-0">{rendered}</div>
        </div>
      ) : (
        rendered
      )}
      {message.error ? (
        <p className="text-sm text-destructive">{message.error}</p>
      ) : null}
    </div>
  );
}

export function MessageList({
  messages,
  showRaw,
  onSuggest,
  busy,
}: {
  messages: ChatMessage[];
  showRaw: boolean;
  onSuggest: (prompt: string) => void;
  busy: boolean;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-16">
            <div>
              <h2 className="text-3xl font-medium tracking-tight">Where to?</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Ask for a city and a length. The reply is OpenUI Lang, rendered
                as an itinerary, a day table, a budget chart, and a booking
                button.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onSuggest(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-md rounded-2xl bg-muted px-4 py-2 text-sm">
                  {message.content}
                </p>
              </div>
            ) : (
              <AssistantTurn
                key={message.id}
                message={message}
                showRaw={showRaw}
              />
            ),
          )
        )}
      </div>
    </ScrollArea>
  );
}
