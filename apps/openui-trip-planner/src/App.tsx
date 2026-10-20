import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { Composer } from "@/chat/Composer.tsx";
import { MessageList } from "@/chat/MessageList.tsx";
import { useChat } from "@/chat/useChat.ts";
import { Route } from "lucide-react";
import { useState } from "react";

export default function App() {
  const { messages, mode, busy, send } = useChat();
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Route className="size-4" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium leading-none">OpenUI Trip Planner</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generative itineraries from OpenUI Lang
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={mode === "live" ? "default" : "secondary"}>
            {mode === "live" ? "Live" : "Mock"}
          </Badge>
          <div className="flex items-center gap-2">
            <Switch
              id="raw-openui"
              checked={showRaw}
              onCheckedChange={setShowRaw}
              aria-label="Raw OpenUI Lang"
            />
            <label htmlFor="raw-openui" className="text-sm">
              Raw OpenUI Lang
            </label>
          </div>
        </div>
      </header>
      <MessageList
        messages={messages}
        showRaw={showRaw}
        busy={busy}
        onSuggest={(prompt) => {
          void send(prompt);
        }}
      />
      <div className="shrink-0 border-t">
        <Composer
          busy={busy}
          onSend={(text) => {
            void send(text);
          }}
        />
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
