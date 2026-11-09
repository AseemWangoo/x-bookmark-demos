import { describe, expect, test } from "bun:test";

import { extractHtml } from "../server/html.ts";

const PAGE = "<!DOCTYPE html><html><body><p>Hi</p></body></html>";

describe("extractHtml", () => {
  test("unwraps a fenced html reply", () => {
    expect(extractHtml(`Here you go:\n\`\`\`html\n${PAGE}\n\`\`\`\n`)).toBe(PAGE);
  });

  test("keeps a raw document", () => {
    expect(extractHtml(`Note.\n${PAGE}`)).toBe(PAGE);
  });

  test("returns the trimmed text when there is no document", () => {
    expect(extractHtml("  not html  ")).toBe("not html");
  });
});
