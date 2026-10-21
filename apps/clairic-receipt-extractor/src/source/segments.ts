import { isUnrecorded, type FieldResult } from "../lib/types.ts";

export type SpanMark = {
  field: string;
  start: number;
  end: number;
};

export type Segment =
  | { type: "text"; text: string }
  | { type: "mark"; text: string; fields: string[] };

export function buildHighlightSegments(source: string, spans: SpanMark[]): Segment[] {
  const clamped = spans
    .map((span) => ({
      field: span.field,
      start: clampIndex(span.start, source.length),
      end: clampIndex(span.end, source.length),
    }))
    .filter((span) => span.end > span.start);

  const points = new Set<number>([0, source.length]);
  for (const span of clamped) {
    points.add(span.start);
    points.add(span.end);
  }

  const bounds = [...points].sort((left, right) => left - right);
  const segments: Segment[] = [];

  for (let index = 0; index < bounds.length - 1; index += 1) {
    const start = bounds[index] ?? 0;
    const end = bounds[index + 1] ?? start;
    if (end <= start) continue;
    const text = source.slice(start, end);
    const fields: string[] = [];
    for (const span of clamped) {
      if (span.start <= start && span.end >= end && !fields.includes(span.field)) {
        fields.push(span.field);
      }
    }
    if (fields.length === 0) {
      segments.push({ type: "text", text });
    } else {
      segments.push({ type: "mark", text, fields });
    }
  }

  return mergeAdjacent(segments).filter((segment) => segment.text.length > 0);
}

export function spansFromAnswers(answers: Record<string, FieldResult>): SpanMark[] {
  const marks: SpanMark[] = [];
  for (const [field, result] of Object.entries(answers)) {
    if (isUnrecorded(result)) continue;
    if (result.type === "text" && result.span) {
      marks.push({ field, start: result.span[0], end: result.span[1] });
    }
    if (result.type === "list" && result.spans) {
      for (const [start, end] of result.spans) {
        marks.push({ field, start, end });
      }
    }
  }
  return marks;
}

function clampIndex(index: number, length: number): number {
  if (Number.isNaN(index)) return 0;
  return Math.max(0, Math.min(length, index));
}

function mergeAdjacent(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (previous?.type === "text" && segment.type === "text") {
      previous.text += segment.text;
      continue;
    }
    if (
      previous?.type === "mark" &&
      segment.type === "mark" &&
      sameFields(previous.fields, segment.fields)
    ) {
      previous.text += segment.text;
      continue;
    }
    if (segment.type === "mark") {
      merged.push({ type: "mark", text: segment.text, fields: [...segment.fields] });
    } else {
      merged.push({ type: "text", text: segment.text });
    }
  }
  return merged;
}

function sameFields(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((field, index) => field === right[index]);
}
