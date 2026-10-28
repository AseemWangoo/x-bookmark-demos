import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ask, fetchMode, resetPortal, runAddVendor } from "@/lib/api";
import { primaryRowCount } from "@/lib/rows";
import type { CallResult, ModeReport, VendorInput } from "@/lib/types";
import { Composer } from "@/chat/Composer";
import { ConfirmWrite } from "@/chat/ConfirmWrite";
import { ExampleChips } from "@/chat/ExampleChips";
import { ToolCallPanel } from "@/chat/ToolCallPanel";
import { EstimatePanel } from "@/estimate/EstimatePanel";
import type { EstimateTask } from "@/lib/estimate";

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "help"; text: string }
  | { id: string; role: "confirm"; input: VendorInput; secondsPerStep: number }
  | { id: string; role: "answer"; task: EstimateTask; result: CallResult; secondsPerStep: number }
  | { id: string; role: "error"; text: string };

let nextId = 0;
function id(): string {
  nextId += 1;
  return String(nextId);
}

export default function App() {
  const [mode, setMode] = useState<ModeReport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetchMode()
      .then(setMode)
      .catch((error: unknown) => {
        setMessages((current) => [
          ...current,
          { id: id(), role: "error", text: error instanceof Error ? error.message : "mode failed" },
        ]);
      });
  }, []);

  async function send(text: string) {
    setPending(true);
    setMessages((current) => [...current, { id: id(), role: "user", text }]);
    try {
      const response = await ask(text);
      switch (response.kind) {
        case "help":
          setMessages((current) => [
            ...current,
            { id: id(), role: "help", text: response.message },
          ]);
          break;
        case "needs-confirm":
          setMessages((current) => [
            ...current,
            { id: id(), role: "confirm", input: response.input, secondsPerStep: response.secondsPerStep },
          ]);
          break;
        case "call":
          setMessages((current) => [
            ...current,
            {
              id: id(),
              role: "answer",
              task: response.integration,
              result: response.result,
              secondsPerStep: response.secondsPerStep,
            },
          ]);
          break;
        default: {
          const neverResponse: never = response;
          void neverResponse;
          throw new Error("Unknown reply");
        }
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: id(), role: "error", text: error instanceof Error ? error.message : "ask failed" },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function confirm(input: VendorInput) {
    setPending(true);
    try {
      const response = await runAddVendor(input);
      setMessages((current) => [
        ...current,
        {
          id: id(),
          role: "answer",
          task: "add_vendor",
          result: response.result,
          secondsPerStep: response.secondsPerStep,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: id(), role: "error", text: error instanceof Error ? error.message : "call failed" },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function reset() {
    setPending(true);
    try {
      await resetPortal();
      setMode(await fetchMode());
      setMessages((current) => [
        ...current,
        { id: id(), role: "help", text: "Portal data reset to the seed." },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: id(), role: "error", text: error instanceof Error ? error.message : "reset failed" },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-7xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Pomerado Legacy Portal</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A clunky accounts-payable portal, minted into three deterministic MCP tools. Runs make
            no model request.
          </p>
          {mode ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={mode.mode === "local" ? "default" : "secondary"}>{mode.mode}</Badge>
              <span>{mode.reason}</span>
              <span className="text-muted-foreground">
                pomerado {mode.pomeradoVersion ?? "unknown"} · node {mode.node ?? "unknown"}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          {mode?.portalUrl ? (
            <Button variant="outline" asChild>
              <a href={mode.portalUrl} target="_blank" rel="noreferrer">
                Open portal
              </a>
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void reset()} disabled={pending}>
            Reset portal data
          </Button>
        </div>
      </header>

      <div className="space-y-4" aria-live="polite">
        {messages.map((message) => {
          switch (message.role) {
            case "user":
              return (
                <p key={message.id} className="text-sm font-medium">
                  {message.text}
                </p>
              );
            case "help":
              return (
                <Card key={message.id}>
                  <CardContent className="pt-4 text-sm">{message.text}</CardContent>
                </Card>
              );
            case "error":
              return (
                <p key={message.id} role="alert" className="text-sm text-destructive">
                  {message.text}
                </p>
              );
            case "confirm":
              return (
                <div key={message.id} className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
                  <ConfirmWrite initial={message.input} pending={pending} onRun={(input) => void confirm(input)} />
                  <EstimatePanel
                    task="add_vendor"
                    rowCount={1}
                    secondsPerStep={message.secondsPerStep}
                    measuredSeconds={null}
                  />
                </div>
              );
            case "answer":
              return (
                <div key={message.id} className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
                  <ToolCallPanel result={message.result} />
                  <EstimatePanel
                    task={message.task}
                    rowCount={message.task === "add_vendor" ? 1 : primaryRowCount(message.result.output)}
                    secondsPerStep={message.secondsPerStep}
                    measuredSeconds={message.result.ms / 1000}
                  />
                </div>
              );
            default: {
              const neverMessage: never = message;
              void neverMessage;
              return null;
            }
          }
        })}
      </div>

      <ExampleChips onPick={(text) => void send(text)} disabled={pending} />
      <Composer pending={pending} onSend={(text) => void send(text)} />

      <footer className="text-xs text-muted-foreground">
        Pomerado&apos;s own site claims that onboarding 2 new employees across HR, IT, courses, and
        library systems finished in 8 minutes 16 seconds for 3 cents, versus Codex Computer Use at
        21 minutes 22 seconds and $41.01, and that the tool is 2–4× faster, 10–1000× cheaper, and
        +30% more reliable than browser use (30 tasks, one try each). This demo did not measure
        that.{" "}
        <a className="underline" href="https://pomerado.ai/" target="_blank" rel="noreferrer">
          pomerado.ai
        </a>
      </footer>
    </main>
  );
}
