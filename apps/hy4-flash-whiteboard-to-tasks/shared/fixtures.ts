import type { Board, Region, Source } from "./schema.ts";
import type { Usage } from "./types.ts";

export type FixtureImage = {
  id: string;
  name: string;
  src: string;
};

export type Fixture = {
  id: string;
  label: string;
  blurb: string;
  text: string;
  images: FixtureImage[];
  board: Board;
  usage: Usage;
  ttftMs: number;
  latencyMs: number;
};

const VIEW_W = 1200;
const VIEW_H = 780;

function region(x: number, y: number, w: number, h: number): Region {
  const round = (value: number) => Math.round(value * 10000) / 10000;
  return {
    x: round(x / VIEW_W),
    y: round(y / VIEW_H),
    w: round(w / VIEW_W),
    h: round(h / VIEW_H),
  };
}

function lineOf(lines: readonly string[], needle: string): number {
  const index = lines.findIndex((line) => line.includes(needle));
  if (index < 0) throw new Error(`Fixture line not found: ${needle}`);
  return index + 1;
}

function textSource(lines: readonly string[], needle: string, quote: string): Source {
  const startLine = lineOf(lines, needle);
  const line = lines[startLine - 1] ?? "";
  if (!line.includes(quote)) throw new Error(`Quote is not on its fixture line: ${quote}`);
  return {
    type: "text",
    imageId: null,
    imageName: null,
    quote,
    startLine,
    endLine: startLine,
    region: null,
  };
}

function imageSource(imageId: string, imageName: string, quote: string, box: Region): Source {
  return {
    type: "image",
    imageId,
    imageName,
    quote,
    startLine: null,
    endLine: null,
    region: box,
  };
}

const sprintLines = [
  "mira  09:14  paging: checkout 5xx spiked after the 08:40 deploy. error budget is gone for the week.",
  "priya 09:16  i see it. webhook signatures from the new edge build do not match what billing expects. i can patch the verifier.",
  "sam   09:18  hold the patch until i rotate the signing key. the current key is the one that leaked into the staging log on tuesday.",
  "mira  09:21  ack. incident channel stays #pay-red until friday standup. do not close it early.",
  "jules 09:27  status page still says minor. legal asked us not to say payments down until they review the wording.",
  "priya 09:33  so the board is: i own checkout retries, target friday 21 nov, blocked on sam's key rotation.",
  "sam   09:36  key rotation is mine. i can do it today if pager noise stays under 2 pages an hour. otherwise i am in the war room.",
  "jules 09:41  i will draft the status page copy and park it in the legal queue. no ship date until they reply.",
  "mira  09:48  add a follow-up: page budget owner is sam, due wednesday, before the next freeze.",
  "lee   10:02  customer mail is piling up in support. we owe a plain-language note once jules has approved copy. i can send it.",
  "priya 10:11  also write down the open question from the whiteboard: do we retry idempotency keys or mint new ones after a 5xx?",
  "sam   10:16  second open question: is the leaked staging key definitely unused in production, or do we assume it is live?",
  "mira  10:22  assume it is live. treat production as rotated only after sam posts the key id in #pay-red.",
  "jules 10:30  third question, not a task: can status copy mention card retries or is that also blocked by legal?",
];

const rfcLines = [
  "RFC-41  Hy4 flash task index",
  "Author: Nia Kapoor    Status: review    Date: 18 Nov 2026",
  "",
  "Summary",
  "One request should carry the whiteboard photos and this RFC. The model returns tasks and open questions. We do not run a separate OCR pass.",
  "",
  "Proposal",
  "The edge gateway accepts up to six images plus the pasted thread and forwards a single Chat Completions call. The task index stores the JSON board. Blobs stay in the object store for seven days.",
  "",
  "Action items from the review board",
  "Nia: freeze the board schema (tasks, open questions, source region) before Thursday. Priority high. Status in progress.",
  "Owen: cap request bodies at 100 MB and reject a single image over 10 MB. Due Wednesday. Status todo.",
  "Rae: document that regions are approximate 0-1 boxes, not pixel-perfect OCR. Due Friday. Status todo.",
  "Nia: keep the default effort on no_think. Thinking stays an explicit toggle. Status in progress. Due this week.",
  "",
  "Blockers",
  "Schema freeze is blocked on whether imageId is required when the source type is text. Owen wants it nullable. Do not ship the index until that is decided.",
  "",
  "Open questions",
  "Is a missing bbox still a valid image source if the filename is present? The board says yes. Confirm with Rae.",
  "Do repeat extracts of the same photo count as cache hits on TokenHub, or only identical text prefixes?",
  "Should the desk refuse animated GIFs even though the API allows a non-animated GIF?",
  "",
  "Out of scope",
  "Downloading weights, OpenCode free-tier calls, and multi-user boards.",
];

const sprintBoard: Board = {
  summary:
    "Checkout 5xx after the 08:40 deploy. Retries are blocked on a signing-key rotation, the status page is in legal review, and #pay-red stays open through Friday standup.",
  tasks: [
    {
      id: "t1",
      title: "Patch checkout retries",
      details: "Verifier mismatch on the new edge build. Blocked until Sam rotates the signing key.",
      owner: "Priya",
      dueHint: "Fri 21 Nov",
      priority: "high",
      status: "blocked",
      source: imageSource(
        "sprint-kanban",
        "sprint-kanban.png",
        "Retry checkout 5xx - Priya - Fri 21 Nov",
        region(56, 168, 320, 148),
      ),
    },
    {
      id: "t2",
      title: "Rotate the signing key",
      details: "The current key leaked into the staging log on Tuesday. Treat production as live until the new key id is posted.",
      owner: "Sam",
      dueHint: "Today",
      priority: "high",
      status: "in_progress",
      source: textSource(
        sprintLines,
        "rotate the signing key",
        "hold the patch until i rotate the signing key.",
      ),
    },
    {
      id: "t3",
      title: "Keep #pay-red open through Friday standup",
      details: "Do not close the incident channel early.",
      owner: "Mira",
      dueHint: "Friday standup",
      priority: "medium",
      status: "in_progress",
      source: textSource(
        sprintLines,
        "#pay-red until friday standup",
        "incident channel stays #pay-red until friday standup.",
      ),
    },
    {
      id: "t4",
      title: "Draft status page copy for legal",
      details: "Page still says minor. No ship date until legal replies. Do not say payments down.",
      owner: "Jules",
      dueHint: "Legal queue",
      priority: "medium",
      status: "blocked",
      source: imageSource(
        "sprint-blockers",
        "sprint-blockers.png",
        "Legal hold on status wording - Jules",
        region(640, 170, 480, 230),
      ),
    },
    {
      id: "t5",
      title: "Hold pager noise under 2 pages an hour",
      details: "Sam needs the budget before the next freeze, otherwise key rotation waits on the war room.",
      owner: "Sam",
      dueHint: "Wednesday",
      priority: "high",
      status: "todo",
      source: textSource(
        sprintLines,
        "page budget owner is sam",
        "page budget owner is sam, due wednesday",
      ),
    },
    {
      id: "t6",
      title: "Send the plain-language customer note",
      details: "Support mail is piling up. Send it only after Jules has approved copy.",
      owner: "Lee",
      dueHint: "After approved copy",
      priority: "low",
      status: "todo",
      source: textSource(
        sprintLines,
        "plain-language note",
        "we owe a plain-language note once jules has approved copy.",
      ),
    },
  ],
  openQuestions: [
    {
      id: "q1",
      question: "After a checkout 5xx, do we retry the same idempotency key or mint a new one?",
      source: textSource(
        sprintLines,
        "idempotency keys",
        "do we retry idempotency keys or mint new ones after a 5xx?",
      ),
    },
    {
      id: "q2",
      question: "Is the leaked staging key definitely unused in production, or do we assume it is live?",
      source: textSource(
        sprintLines,
        "leaked staging key",
        "is the leaked staging key definitely unused in production",
      ),
    },
    {
      id: "q3",
      question: "Can the status copy mention card retries, or is that blocked by legal too?",
      source: textSource(
        sprintLines,
        "card retries",
        "can status copy mention card retries",
      ),
    },
    {
      id: "q4",
      question: "Should the board treat a partial auth as success?",
      source: imageSource(
        "sprint-calendar",
        "sprint-calendar.png",
        "Open: partial auth as success?",
        region(70, 500, 520, 180),
      ),
    },
  ],
};

const rfcBoard: Board = {
  summary:
    "RFC-41 stores one JSON board from a single Chat Completions call. Schema freeze is blocked on a nullable imageId, and regions stay approximate.",
  tasks: [
    {
      id: "t1",
      title: "Freeze the board schema",
      details: "Tasks, open questions, and source region need to be frozen before Thursday.",
      owner: "Nia",
      dueHint: "Thursday",
      priority: "high",
      status: "in_progress",
      source: textSource(
        rfcLines,
        "freeze the board schema",
        "freeze the board schema (tasks, open questions, source region) before Thursday.",
      ),
    },
    {
      id: "t2",
      title: "Cap request bodies at 100 MB",
      details: "Reject a single image over 10 MB.",
      owner: "Owen",
      dueHint: "Wednesday",
      priority: "high",
      status: "todo",
      source: textSource(
        rfcLines,
        "cap request bodies",
        "cap request bodies at 100 MB and reject a single image over 10 MB.",
      ),
    },
    {
      id: "t3",
      title: "Document that regions are approximate",
      details: "0-1 boxes, not pixel-perfect OCR.",
      owner: "Rae",
      dueHint: "Friday",
      priority: "medium",
      status: "todo",
      source: imageSource(
        "rfc-risks",
        "rfc-risks.png",
        "Regions are approximate 0-1. Rae, Friday.",
        region(60, 140, 520, 220),
      ),
    },
    {
      id: "t4",
      title: "Keep the default effort on no_think",
      details: "Thinking stays an explicit toggle.",
      owner: "Nia",
      dueHint: "This week",
      priority: "medium",
      status: "in_progress",
      source: textSource(
        rfcLines,
        "default effort on no_think",
        "keep the default effort on no_think.",
      ),
    },
    {
      id: "t5",
      title: "Decide whether imageId is nullable on text sources",
      details: "Owen wants it nullable. Do not ship the index until that is decided.",
      owner: "Owen",
      dueHint: "Before ship",
      priority: "high",
      status: "blocked",
      source: textSource(
        rfcLines,
        "imageId is required",
        "Schema freeze is blocked on whether imageId is required when the source type is text.",
      ),
    },
    {
      id: "t6",
      title: "One Chat Completions pass, no separate OCR",
      details: "The task index stores the JSON board. Blobs stay seven days.",
      owner: "Nia",
      dueHint: "This review",
      priority: "medium",
      status: "in_progress",
      source: imageSource(
        "rfc-topology",
        "rfc-topology.png",
        "Task index",
        region(460, 200, 280, 180),
      ),
    },
  ],
  openQuestions: [
    {
      id: "q1",
      question: "Is a missing bbox still a valid image source when the filename is present?",
      source: textSource(
        rfcLines,
        "missing bbox",
        "Is a missing bbox still a valid image source if the filename is present?",
      ),
    },
    {
      id: "q2",
      question: "Do repeat extracts of the same photo count as TokenHub cache hits?",
      source: imageSource(
        "rfc-risks",
        "rfc-risks.png",
        "Open: do repeat photos count as cache hits?",
        region(640, 150, 480, 210),
      ),
    },
    {
      id: "q3",
      question: "Should the desk refuse animated GIFs even though a non-animated GIF is allowed?",
      source: textSource(
        rfcLines,
        "animated GIFs",
        "Should the desk refuse animated GIFs even though the API allows a non-animated GIF?",
      ),
    },
  ],
};

function usage(inputTokens: number, cachedTokens: number, outputTokens: number): Usage {
  return {
    inputTokens,
    cachedTokens,
    outputTokens,
    reasoningTokens: 0,
    totalTokens: inputTokens + outputTokens,
    estimated: false,
  };
}

export const FIXTURES: Fixture[] = [
  {
    id: "sprint-incident",
    label: "Sprint whiteboard + incident thread",
    blurb: "Checkout 5xx, a signing-key rotation, and a legal hold on the status page.",
    text: sprintLines.join("\n"),
    images: [
      { id: "sprint-kanban", name: "sprint-kanban.png", src: "/fixtures/sprint-kanban.png" },
      { id: "sprint-blockers", name: "sprint-blockers.png", src: "/fixtures/sprint-blockers.png" },
      { id: "sprint-calendar", name: "sprint-calendar.png", src: "/fixtures/sprint-calendar.png" },
    ],
    board: sprintBoard,
    usage: usage(6120, 980, 740),
    ttftMs: 168,
    latencyMs: 1124,
  },
  {
    id: "rfc-review",
    label: "Architecture review board + RFC",
    blurb: "One-pass task index, a schema freeze, and approximate regions.",
    text: rfcLines.join("\n"),
    images: [
      { id: "rfc-topology", name: "rfc-topology.png", src: "/fixtures/rfc-topology.png" },
      { id: "rfc-risks", name: "rfc-risks.png", src: "/fixtures/rfc-risks.png" },
    ],
    board: rfcBoard,
    usage: usage(4980, 0, 690),
    ttftMs: 204,
    latencyMs: 1376,
  },
];

export function getFixture(id: string): Fixture | undefined {
  return FIXTURES.find((fixture) => fixture.id === id);
}

export function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n");
}
