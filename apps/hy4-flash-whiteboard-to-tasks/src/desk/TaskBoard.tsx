import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { Priority, Source, Status } from "../../shared/schema.ts";
import type { ExtractResult } from "../../shared/types.ts";
import { priorityLabel, statusLabel } from "../lib/labels.ts";

export type ActiveItem = { kind: "task" | "question"; id: string };

type TaskBoardProps = {
  result: ExtractResult | null;
  error: string | null;
  active: ActiveItem | null;
  onActive: (item: ActiveItem) => void;
};

type Filters = {
  owner: string;
  priority: "all" | Priority;
  status: "all" | Status;
  due: string;
};

const emptyFilters: Filters = { owner: "all", priority: "all", status: "all", due: "all" };

export function sourceFor(result: ExtractResult | null, active: ActiveItem | null): Source | null {
  if (!result || !active) return null;
  if (active.kind === "task") {
    return result.board.tasks.find((task) => task.id === active.id)?.source ?? null;
  }
  return result.board.openQuestions.find((question) => question.id === active.id)?.source ?? null;
}

export function TaskBoard({ result, error, active, onActive }: TaskBoardProps) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const tasks = result?.board.tasks;
  const owners = useMemo(() => unique(tasks?.map((task) => task.owner) ?? []), [tasks]);
  const dues = useMemo(() => unique(tasks?.map((task) => task.dueHint) ?? []), [tasks]);
  const visible = (tasks ?? []).filter((task) => {
    if (filters.owner !== "all" && task.owner !== filters.owner) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.due !== "all" && task.dueHint !== filters.due) return false;
    return true;
  });

  return (
    <section id="task-board" className="flex min-h-0 flex-col gap-2" data-testid="task-board">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Task board</h2>
        {result ? (
          <p className="text-xs text-muted-foreground">
            {result.outputMode === "recorded" ? "Recorded sample board" : result.outputMode}
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="extract-error">
          {error}
        </p>
      ) : null}
      {!result ? (
        <p className="rounded-lg bg-card px-3 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Load a sample fixture, then extract. Each task links back to a photo region or a line in the thread.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
          <p className="text-sm">{result.board.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Filter label="Owner" value={filters.owner} onChange={(owner) => setFilters({ ...filters, owner })} options={["all", ...owners]} />
            <Filter
              label="Priority"
              value={filters.priority}
              onChange={(priority) => setFilters({ ...filters, priority: priority as Filters["priority"] })}
              options={["all", "low", "medium", "high"]}
            />
            <Filter
              label="Status"
              value={filters.status}
              onChange={(status) => setFilters({ ...filters, status: status as Filters["status"] })}
              options={["all", "todo", "in_progress", "blocked", "done"]}
            />
            <Filter label="Due" value={filters.due} onChange={(due) => setFilters({ ...filters, due })} options={["all", ...dues]} />
          </div>
          <ul className="flex flex-col gap-1.5">
            {visible.length === 0 ? <li className="text-sm text-muted-foreground">No tasks match these filters.</li> : null}
            {visible.map((task) => {
              const selected = active?.kind === "task" && active.id === task.id;
              return (
                <li
                  key={task.id}
                  className={`rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10 ${selected ? "ring-2 ring-primary" : ""}`}
                  data-testid={`task-${task.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <Badge variant={task.status === "blocked" ? "destructive" : "secondary"}>{statusLabel(task.status)}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{task.details}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-muted px-1.5 py-0.5">{task.owner}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5">{task.dueHint}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5">{priorityLabel(task.priority)}</span>
                    <SourceButton
                      source={task.source}
                      pressed={selected}
                      testId={`source-task-${task.id}`}
                      onClick={() => onActive({ kind: "task", id: task.id })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div data-testid="open-questions">
            <h3 className="mb-1 text-sm font-medium">Open questions</h3>
            <ul className="flex flex-col gap-1.5">
              {result.board.openQuestions.map((question) => {
                const selected = active?.kind === "question" && active.id === question.id;
                return (
                  <li key={question.id} className={`rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10 ${selected ? "ring-2 ring-primary" : ""}`}>
                    <p className="text-sm">{question.question}</p>
                    <div className="mt-1">
                      <SourceButton
                        source={question.source}
                        pressed={selected}
                        testId={`source-question-${question.id}`}
                        onClick={() => onActive({ kind: "question", id: question.id })}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function SourceButton({
  source,
  pressed,
  testId,
  onClick,
}: {
  source: Source;
  pressed: boolean;
  testId: string;
  onClick: () => void;
}) {
  const label =
    source.type === "image"
      ? `Image · ${source.imageName ?? source.imageId ?? "photo"}`
      : `Lines ${source.startLine ?? "?"}–${source.endLine ?? "?"}`;
  return (
    <button
      type="button"
      className={`rounded-full px-1.5 py-0.5 underline decoration-[#9f1239] underline-offset-2 ${pressed ? "bg-[#fde68a]" : "bg-transparent"}`}
      aria-pressed={pressed}
      data-testid={testId}
      data-source-type={source.type}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="rounded-md border bg-background px-1 py-0.5"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : option === "in_progress" ? "In progress" : option === "todo" ? "To do" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
