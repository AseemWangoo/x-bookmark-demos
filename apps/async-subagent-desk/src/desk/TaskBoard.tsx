import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fetchTasks, postTaskAction } from "@/lib/api";
import { isSubmitEnter } from "@/lib/ime";
import {
  ASYNC_TOOL_NAMES,
  elapsedMs,
  formatElapsed,
  isTerminalStatus,
  statusLabel,
  type AgentName,
  type TaskStatus,
  type TaskView,
} from "../../shared/desk.ts";

type Filter = "all" | AgentName;

export function TaskBoard({ refreshKey }: { refreshKey: number }) {
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("");
  const seen = useRef<string>("");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await fetchTasks();
        if (!cancelled) setTasks(next);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load tasks.");
        }
      }
    }
    void load();
    const timer = setInterval(() => void load(), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshKey]);

  useEffect(() => {
    const signature = tasks.map((task) => `${task.taskId}:${task.status}`).join("|");
    if (seen.current === signature) return;
    const first = seen.current === "";
    seen.current = signature;
    if (first) return;
    setAnnouncement(
      tasks.length === 0
        ? "No background tasks."
        : tasks.map((task) => `${task.agentName} is ${task.status}`).join(". "),
    );
  }, [tasks]);

  const visible = tasks.filter((task) => filter === "all" || task.agentName === filter);

  return (
    <aside className="flex min-h-0 flex-col border-t lg:border-s lg:border-t-0" aria-labelledby="tasks-heading">
      <div className="px-4 pt-4">
        <h2 id="tasks-heading" className="text-base font-medium">
          Background tasks
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cards poll. The lead agent does not. Synchronous <span className="font-mono">task</span> is not used.
        </p>
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Async tools">
          {ASYNC_TOOL_NAMES.map((name) => (
            <li key={name}>
              <Badge variant="outline" className="font-mono">
                {name}
              </Badge>
            </li>
          ))}
        </ul>
        <Tabs
          value={filter}
          onValueChange={(value) => {
            if (value === "all" || value === "researcher" || value === "coder") setFilter(value);
          }}
          className="mt-3"
        >
          <TabsList aria-label="Filter tasks">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="researcher">Researcher</TabsTrigger>
            <TabsTrigger value="coder">Coder</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ScrollArea className="min-h-0 flex-1 px-4">
        <ul className="flex flex-col gap-3 py-4">
          {visible.length === 0 ? (
            <li className="text-sm text-muted-foreground" data-testid="tasks-empty">
              No background tasks. Start one from the chat. The lead agent stays available.
            </li>
          ) : null}
          {visible.map((task) => (
            <TaskCard
              key={task.taskId}
              task={task}
              now={now}
              onChange={(next) => {
                setTasks((current) =>
                  current.map((item) => (item.taskId === next.taskId ? next : item)),
                );
              }}
            />
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}

function TaskCard({
  task,
  now,
  onChange,
}: {
  task: TaskView;
  now: number;
  onChange: (task: TaskView) => void;
}) {
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const followId = `follow-${task.taskId}`;
  const cancellable = task.status === "pending" || task.status === "running" || task.status === "waiting";
  const canFollow = task.status !== "cancelled";

  async function run(action: "check" | "update" | "cancel") {
    setBusy(true);
    try {
      const next = await postTaskAction(
        task.taskId,
        action,
        action === "update" ? { message: followUp } : undefined,
      );
      onChange(next);
      if (action === "update") setFollowUp("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Task action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <Card size="sm" data-testid="task-card" data-agent={task.agentName} data-status={task.status}>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium capitalize">{task.agentName}</h3>
            <Badge
              variant={badgeVariant(task.status)}
              className={task.status === "success" ? "bg-emerald-700 text-white" : undefined}
              data-testid="task-status"
            >
              <span className={task.status === "running" ? "status-dot" : undefined} aria-hidden="true" />
              {statusLabel(task.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="whitespace-pre-wrap text-sm">{task.description}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Task id</dt>
            <dd className="truncate font-mono" title={task.taskId}>
              {task.taskId}
            </dd>
            <dt className="text-muted-foreground">Elapsed</dt>
            <dd>{formatElapsed(elapsedMs(task, now))}</dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString() : "—"}</dd>
            {task.lastAction ? (
              <>
                <dt className="text-muted-foreground">Last tool</dt>
                <dd className="font-mono">{task.lastAction}</dd>
              </>
            ) : null}
          </dl>
          {task.result ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {task.simulated ? "Simulated result — no model calls" : "Subagent result"}
              </p>
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-sans text-sm" data-testid="task-result">
                {displayResult(task)}
              </pre>
            </div>
          ) : null}
          {isTerminalStatus(task.status) && !task.result && task.status !== "success" ? (
            <p className="text-xs text-muted-foreground">No result. Status is {task.status}.</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              data-testid="task-check"
              disabled={busy}
              onClick={() => void run("check")}
            >
              Check now
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              data-testid="task-cancel"
              disabled={busy || !cancellable}
              onClick={() => void run("cancel")}
            >
              Cancel
            </Button>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!followUp.trim() || !canFollow) return;
              void run("update");
            }}
          >
            <label htmlFor={followId} className="mb-1 block text-xs font-medium">
              Follow-up for {task.agentName}
            </label>
            <Textarea
              id={followId}
              data-testid="task-follow-up"
              value={followUp}
              disabled={!canFollow || busy}
              className="min-h-11 text-base"
              autoComplete="off"
              onChange={(event) => setFollowUp(event.target.value)}
              onKeyDown={(event) => {
                if (!isSubmitEnter(event)) return;
                event.preventDefault();
                if (!followUp.trim() || !canFollow) return;
                void run("update");
              }}
            />
            <Button
              type="submit"
              variant="secondary"
              className="mt-2 min-h-11"
              disabled={busy || !canFollow || !followUp.trim()}
            >
              Send follow-up
            </Button>
          </form>
        </CardFooter>
      </Card>
    </li>
  );
}

function displayResult(task: TaskView): string {
  if (!task.result) return "";
  if (!task.simulated) return task.result;
  return task.result.replace(/^Simulated result — no model calls\.\s*/, "");
}

function badgeVariant(status: TaskStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "outline";
    case "running":
      return "default";
    case "waiting":
      return "secondary";
    case "success":
      return "secondary";
    case "error":
    case "timeout":
      return "destructive";
    case "cancelled":
    case "interrupted":
      return "outline";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
