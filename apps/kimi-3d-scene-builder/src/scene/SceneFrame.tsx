import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SceneError } from "@/lib/types";
import { isFrameMessage } from "@/sandbox/protocol";

type Run = { token: number; code: string };

type Status = "idle" | "rendering" | "ready" | "error" | "timed out";

export function SceneFrame({
  run,
  onReady,
  onError,
  onTimeout,
}: {
  run: Run | null;
  onReady: () => void;
  onError: (error: SceneError) => void;
  onTimeout: (error: SceneError) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onTimeoutRef = useRef(onTimeout);
  const [status, setStatus] = useState<Status>("idle");

  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !run) {
      setStatus("idle");
      if (host) host.replaceChildren();
      iframeRef.current = null;
      return;
    }

    let failed = false;
    let ready = false;
    let readyTimer = 0;
    let heartbeatTimer = 0;
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.src = "/sandbox.html";
    iframe.title = "Scene sandbox";
    iframe.className = "h-full w-full border-0 bg-neutral-950";
    iframe.dataset.testid = "scene-frame";

    const clearTimers = () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(heartbeatTimer);
    };

    const recreateIdle = () => {
      const fresh = document.createElement("iframe");
      fresh.setAttribute("sandbox", "allow-scripts");
      fresh.src = "/sandbox.html";
      fresh.title = "Scene sandbox";
      fresh.className = "h-full w-full border-0 bg-neutral-950";
      host.replaceChildren(fresh);
      iframeRef.current = fresh;
    };

    const fail = (message: string) => {
      if (failed) return;
      failed = true;
      clearTimers();
      setStatus("timed out");
      onTimeoutRef.current({ phase: "timeout", message });
      iframe.remove();
      recreateIdle();
    };

    const armHeartbeat = () => {
      window.clearTimeout(heartbeatTimer);
      heartbeatTimer = window.setTimeout(() => {
        if (failed || !ready) return;
        fail("The scene stopped sending heartbeats. The iframe was recreated.");
      }, 4000);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (!isFrameMessage(event.data) || event.data.runId !== String(run.token)) return;
      switch (event.data.type) {
        case "ready":
          ready = true;
          window.clearTimeout(readyTimer);
          armHeartbeat();
          setStatus("ready");
          onReadyRef.current();
          return;
        case "heartbeat":
          if (ready && !failed) armHeartbeat();
          return;
        case "error":
          failed = true;
          clearTimers();
          setStatus("error");
          onErrorRef.current({
            phase: event.data.phase,
            message: event.data.message,
            line: event.data.line,
            stack: event.data.stack,
          });
          return;
        default: {
          const unreachable: never = event.data;
          return unreachable;
        }
      }
    };

    const onLoad = () => {
      iframe.contentWindow?.postMessage({ type: "run", runId: String(run.token), code: run.code }, "*");
      readyTimer = window.setTimeout(() => {
        if (!ready && !failed) {
          fail("The scene did not finish building within 8 seconds. The iframe was recreated.");
        }
      }, 8000);
    };

    iframe.addEventListener("load", onLoad);
    window.addEventListener("message", onMessage);
    host.replaceChildren(iframe);
    iframeRef.current = iframe;
    setStatus("rendering");

    return () => {
      failed = true;
      clearTimers();
      window.removeEventListener("message", onMessage);
      iframe.remove();
    };
  }, [run]);

  function resetCamera() {
    iframeRef.current?.contentWindow?.postMessage({ type: "resetCamera" }, "*");
  }

  const chip =
    status === "rendering" ? "rendering" : status === "error" ? "error" : status === "timed out" ? "timed out" : null;

  return (
    <div className="relative min-h-0 flex-1 bg-neutral-950">
      <div ref={hostRef} className="absolute inset-0" />
      {!run && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center text-sm text-neutral-400">
          Pick an example. Code streams first, then the scene renders in this sandbox.
        </div>
      )}
      {chip && (
        <div
          data-testid="scene-status"
          className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white"
        >
          {chip}
        </div>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3"
        data-testid="reset-camera"
        disabled={!run || status === "idle"}
        onClick={resetCamera}
      >
        Reset camera
      </Button>
    </div>
  );
}
