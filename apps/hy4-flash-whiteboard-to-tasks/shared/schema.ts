import { z } from "zod";

export const prioritySchema = z.enum(["low", "medium", "high"]);
export const statusSchema = z.enum(["todo", "in_progress", "blocked", "done"]);
export const effortSchema = z.enum(["no_think", "high"]);

export const regionSchema = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const sourceSchema = z.strictObject({
  type: z.enum(["image", "text"]),
  imageId: z.string().nullable(),
  imageName: z.string().nullable(),
  quote: z.string().nullable(),
  startLine: z.number().int().nullable(),
  endLine: z.number().int().nullable(),
  region: regionSchema.nullable(),
});

export const taskSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  details: z.string(),
  owner: z.string().min(1),
  dueHint: z.string().min(1),
  priority: prioritySchema,
  status: statusSchema,
  source: sourceSchema,
});

export const questionSchema = z.strictObject({
  id: z.string().min(1),
  question: z.string().min(1),
  source: sourceSchema,
});

export const boardSchema = z.strictObject({
  summary: z.string(),
  tasks: z.array(taskSchema),
  openQuestions: z.array(questionSchema),
});

export type Priority = z.infer<typeof prioritySchema>;
export type Status = z.infer<typeof statusSchema>;
export type Effort = z.infer<typeof effortSchema>;
export type Region = z.infer<typeof regionSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Task = z.infer<typeof taskSchema>;
export type OpenQuestion = z.infer<typeof questionSchema>;
export type Board = z.infer<typeof boardSchema>;

const regionJson = {
  type: "object",
  additionalProperties: false,
  properties: {
    x: { type: "number" },
    y: { type: "number" },
    w: { type: "number" },
    h: { type: "number" },
  },
  required: ["x", "y", "w", "h"],
} as const;

const sourceJson = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["image", "text"] },
    imageId: { type: ["string", "null"] },
    imageName: { type: ["string", "null"] },
    quote: { type: ["string", "null"] },
    startLine: { type: ["integer", "null"] },
    endLine: { type: ["integer", "null"] },
    region: { anyOf: [regionJson, { type: "null" }] },
  },
  required: ["type", "imageId", "imageName", "quote", "startLine", "endLine", "region"],
} as const;

export const BOARD_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          details: { type: "string" },
          owner: { type: "string" },
          dueHint: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["todo", "in_progress", "blocked", "done"] },
          source: sourceJson,
        },
        required: ["id", "title", "details", "owner", "dueHint", "priority", "status", "source"],
      },
    },
    openQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          source: sourceJson,
        },
        required: ["id", "question", "source"],
      },
    },
  },
  required: ["summary", "tasks", "openQuestions"],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanRegion(value: unknown): unknown {
  if (value == null) return null;
  if (!isRecord(value)) return null;
  const nums = [value.x, value.y, value.w, value.h].map((item) =>
    typeof item === "number" ? item : Number.NaN,
  );
  if (nums.some((item) => !Number.isFinite(item))) return null;
  const [x, y, w, h] = nums;
  if (x === undefined || y === undefined || w === undefined || h === undefined) return null;
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x > 1 || y > 1 || w > 1 || h > 1) return null;
  if (x + w > 1.001 || y + h > 1.001) return null;
  return { x, y, w, h };
}

function fillSource(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const type = typeof value.type === "string" ? value.type.toLowerCase() : value.type;
  return {
    type,
    imageId: value.imageId ?? null,
    imageName: value.imageName ?? null,
    quote: value.quote ?? null,
    startLine: value.startLine ?? null,
    endLine: value.endLine ?? null,
    region: cleanRegion(value.region),
  };
}

export function fillBoard(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const tasks = Array.isArray(input.tasks)
    ? input.tasks.map((task) => {
        if (!isRecord(task)) return task;
        return {
          id: task.id,
          title: task.title,
          details: task.details ?? "",
          owner: task.owner,
          dueHint: task.dueHint,
          priority: typeof task.priority === "string" ? task.priority.toLowerCase() : task.priority,
          status: typeof task.status === "string" ? task.status.toLowerCase() : task.status,
          source: fillSource(task.source),
        };
      })
    : input.tasks;
  const openQuestions = Array.isArray(input.openQuestions)
    ? input.openQuestions.map((question) => {
        if (!isRecord(question)) return question;
        return {
          id: question.id,
          question: question.question,
          source: fillSource(question.source),
        };
      })
    : input.openQuestions;
  return {
    summary: input.summary ?? "",
    tasks,
    openQuestions,
  };
}

export function parseBoard(input: unknown): { ok: true; board: Board } | { ok: false; error: string } {
  const parsed = boardSchema.safeParse(fillBoard(input));
  if (!parsed.success) {
    return { ok: false, error: "Hy4 flash returned JSON that did not match the task board schema." };
  }
  return { ok: true, board: parsed.data };
}
