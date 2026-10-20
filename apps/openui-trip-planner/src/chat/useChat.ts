import { programForPrompt } from "@/genui/fixtures/generic.ts";
import { streamLive } from "@/stream/live.ts";
import { streamMock } from "@/stream/mock.ts";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, PlannerMode } from "./types.ts";

function readMode(body: unknown): PlannerMode {
  if (typeof body === "object" && body !== null && "mode" in body) {
    const mode = (body as { mode?: unknown }).mode;
    if (mode === "live") return "live";
  }
  return "mock";
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<PlannerMode>("mock");
  const [busy, setBusy] = useState(false);
  const modeRef = useRef<PlannerMode>("mock");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/mode", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return "mock" as const;
        return readMode(await response.json());
      })
      .then((next) => {
        modeRef.current = next;
        setMode(next);
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return;
        modeRef.current = "mock";
        setMode("mock");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function patchAssistant(
    id: string,
    patch: Partial<Pick<ChatMessage, "content" | "streaming" | "error">>,
  ) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, ...patch } : message,
      ),
    );
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const activeMode = modeRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: trimmed, streaming: false },
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setBusy(true);

    try {
      const onChunk = (full: string) => {
        patchAssistant(assistantId, { content: full, streaming: true });
      };
      switch (activeMode) {
        case "mock":
          await streamMock(programForPrompt(trimmed), onChunk, controller.signal);
          break;
        case "live":
          await streamLive(trimmed, onChunk, controller.signal);
          break;
        default: {
          const unreachable: never = activeMode;
          throw new Error(`Unknown planner mode: ${String(unreachable)}`);
        }
      }
      patchAssistant(assistantId, { streaming: false });
    } catch (error) {
      if (isAbort(error)) return;
      const message = error instanceof Error ? error.message : "The plan failed.";
      patchAssistant(assistantId, { streaming: false, error: message });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  return { messages, mode, busy, send };
}
