import { useEffect, useState } from "react";

import { ChatPane } from "@/desk/ChatPane";
import { ModeBanner } from "@/desk/ModeBanner";
import { TaskBoard } from "@/desk/TaskBoard";
import { fetchMode, type ModePayload } from "@/lib/api";

export default function App() {
  const [mode, setMode] = useState<ModePayload | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetchMode()
      .then(setMode)
      .catch(() => setMode(null));
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <a
        href="#chat-heading"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:m-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2"
      >
        Skip to chat
      </a>
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Async Subagent Desk</h1>
          <p className="text-sm text-muted-foreground">
            Start background work, then keep talking.
          </p>
        </div>
      </header>
      <ModeBanner mode={mode} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.9fr)]">
        <main className="flex min-h-0 flex-col">
          <ChatPane
            simulated={mode?.simulated ?? true}
            onActivity={() => setRefreshKey((value) => value + 1)}
          />
        </main>
        <TaskBoard refreshKey={refreshKey} />
      </div>
    </div>
  );
}
