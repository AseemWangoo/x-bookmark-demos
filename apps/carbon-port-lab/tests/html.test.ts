import { describe, expect, test } from "bun:test";

import { extractHtml } from "../server/html.ts";

const DOCUMENT = "<!DOCTYPE html><html><body><canvas></canvas></body></html>";

describe("html extraction", () => {
  test("strips a markdown fence and keeps the document", () => {
    expect(extractHtml("```html\n" + DOCUMENT + "\n```")).toBe(DOCUMENT);
    expect(extractHtml("Sure.\n```html\n" + DOCUMENT + "\n```\n")).toBe(DOCUMENT);
  });

  test("refuses a partial stream", () => {
    expect(extractHtml("<!DOCTYPE html><html><body><canvas></canvas>")).toBeNull();
    expect(extractHtml("```html\n<div>not a document</div>\n```")).toBeNull();
    expect(extractHtml("")).toBeNull();
  });
});
