import type { ToolName } from "../types.ts";

export const RECORDED_METRICS = {
  model: "inkling-2-mini",
  ttftMs: 240,
  wallMs: 3100,
  usage: { inputTokens: 860, outputTokens: 210 },
  turns: 6,
} as const;

export const RECORDED_SUMMARY = `# Pocket summary

Hand-authored recorded summary for the sample pocket. This text ships with the demo. Inkling 2 Mini did not write it.

## Notes

- \`grocery-list.md\` — Saturday market list: oats, coffee beans, lemons. Tags: note, shopping.
- \`flight-reminder.md\` — Personal reminder for SFO → SEA, confirmation XK4P. Tags: note, travel.
- \`tax-note.md\` — Set aside 30% of a freelance invoice. Tags: note, finance.

## Receipts

- \`cafe-receipt.txt\` — Pocket Cafe espresso and oat milk, total 5.25. Tags: receipt, food.
- \`hardware-receipt.png\` — Sample image receipt: notebook 36.00, cable 6.00, total 42.00. Tags: receipt, hardware.

Tags live in \`.pocket/tags.json\`. This file is the only other write. Nothing was deleted.
`;

export type ScriptStep = {
  name: ToolName;
  args: Record<string, unknown>;
  durationMs: number;
  caption?: string;
};

export const RECORDED_STEPS: readonly ScriptStep[] = [
  { name: "list_files", args: {}, durationMs: 42 },
  { name: "read_file", args: { path: "grocery-list.md" }, durationMs: 38 },
  { name: "read_file", args: { path: "flight-reminder.md" }, durationMs: 36 },
  { name: "read_file", args: { path: "tax-note.md" }, durationMs: 34 },
  { name: "read_file", args: { path: "cafe-receipt.txt" }, durationMs: 40 },
  {
    name: "read_file",
    args: { path: "hardware-receipt.png" },
    durationMs: 55,
    caption:
      "Sample image receipt, hand-authored. Notebook 36.00, cable 6.00, total 42.00. Mock mode uses this caption instead of a model read.",
  },
  {
    name: "tag_file",
    args: { path: "grocery-list.md", tags: ["note", "shopping"] },
    durationMs: 28,
  },
  {
    name: "tag_file",
    args: { path: "flight-reminder.md", tags: ["note", "travel"] },
    durationMs: 28,
  },
  {
    name: "tag_file",
    args: { path: "tax-note.md", tags: ["note", "finance"] },
    durationMs: 28,
  },
  {
    name: "tag_file",
    args: { path: "cafe-receipt.txt", tags: ["receipt", "food"] },
    durationMs: 30,
  },
  {
    name: "tag_file",
    args: { path: "hardware-receipt.png", tags: ["receipt", "hardware"] },
    durationMs: 30,
  },
  { name: "write_summary", args: { markdown: RECORDED_SUMMARY }, durationMs: 64 },
];
