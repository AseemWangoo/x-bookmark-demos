import { describe, expect, test } from "bun:test";

import { LENGTH_WARNING, LIVE_REQUIRED, SAMPLE_LABEL } from "../shared/copy.ts";
import { toCsv } from "./csv.ts";
import { stripMarkdownFence } from "./markdown.ts";
import { parseHtmlTable, parseMarkdownTables } from "./tables.ts";

const RECORDED = new URL("../shared/fixtures/recorded.md", import.meta.url);

describe("markdown fence", () => {
  test("strips a wrapping markdown fence and keeps an inner fence", () => {
    const input = "```markdown\nhello\n```mermaid\ngraph TD\n```\ntail\n```";
    expect(stripMarkdownFence(input)).toBe("hello\n```mermaid\ngraph TD\n```\ntail");
  });

  test("leaves prose without a wrapping fence", () => {
    expect(stripMarkdownFence("no fence here")).toBe("no fence here");
  });

  test("does not strip a python fence", () => {
    const input = "```python\nprint(1)\n```";
    expect(stripMarkdownFence(input)).toBe(input);
  });
});

describe("html tables", () => {
  test("flattens colspan and rowspan into a rectangle", () => {
    const html = `<table>
      <thead>
        <tr><th colspan="4">Inbound lots — Dock 4</th></tr>
        <tr><th>Lot</th><th>Item</th><th>Crates</th><th>Temp °C</th></tr>
      </thead>
      <tbody>
        <tr><td rowspan="2">A-14</td><td>Kelp flakes</td><td>18</td><td>4</td></tr>
        <tr><td>Citrus oil</td><td>6</td><td>8</td></tr>
        <tr><td>B-02</td><td>Rye &amp; wheat</td><td>24</td><td>16</td></tr>
      </tbody>
      <tfoot>
        <tr><td colspan="2">Crate total</td><td>48</td><td></td></tr>
      </tfoot>
    </table>`;
    const table = parseHtmlTable(html, 0);
    expect(table).not.toBeNull();
    expect(table?.caption).toBe("Inbound lots — Dock 4");
    expect(table?.headers).toEqual(["Lot", "Item", "Crates", "Temp °C"]);
    expect(table?.rows[0]).toEqual(["A-14", "Kelp flakes", "18", "4"]);
    expect(table?.rows[1]).toEqual(["", "Citrus oil", "6", "8"]);
    expect(table?.rows[2]?.[1]).toBe("Rye & wheat");
    expect(table?.footer[0]).toEqual(["Crate total", "", "48", ""]);
    expect(table?.headerNote).toBeNull();
  });

  test("labels columns when the table has no header cells", () => {
    const table = parseHtmlTable("<table><tr><td>a</td><td>b</td></tr></table>", 0);
    expect(table?.headers).toEqual(["Column 1", "Column 2"]);
    expect(table?.headerNote).toBe("No header cells; columns are labelled Column N.");
    expect(table?.rows).toEqual([["a", "b"]]);
  });

  test("uses the first all-th row as the header when thead is absent", () => {
    const table = parseHtmlTable("<table><tr><th>Lot</th><th>Item</th></tr><tr><td>A-14</td><td>Kelp</td></tr></table>", 0);
    expect(table?.headers).toEqual(["Lot", "Item"]);
    expect(table?.rows).toEqual([["A-14", "Kelp"]]);
  });

  test("turns br into a newline and drops script text", () => {
    const table = parseHtmlTable("<table><tr><th>Note</th></tr><tr><td>line<br>two<script>alert(1)</script></td></tr></table>", 0);
    expect(table?.rows[0]).toEqual(["line\ntwo"]);
  });

  test("grows the grid when rowspan extends past the written rows", () => {
    const table = parseHtmlTable('<table><tr><td rowspan="2">A</td><td>B</td></tr></table>', 0);
    expect(table?.headers).toEqual(["Column 1", "Column 2"]);
    expect(table?.rows).toEqual([
      ["A", "B"],
      ["", ""],
    ]);
  });
});

describe("csv", () => {
  test("quotes commas, quotes, and newlines", () => {
    const csv = toCsv(["Name", "Note"], [['say "hi"', "a,b"], ["line\n2", "ok"]]);
    expect(csv).toBe('Name,Note\r\n"say ""hi""","a,b"\r\n"line\n2",ok\r\n');
  });
});

describe("recorded fixture", () => {
  test("is a hand-authored page with one merged-cell table", async () => {
    const markdown = stripMarkdownFence(await Bun.file(RECORDED).text());
    expect(markdown.startsWith("```")).toBe(false);
    const tables = parseMarkdownTables(markdown);
    expect(tables).toHaveLength(1);
    expect(tables[0]?.caption).toBe("Hand-authored table. Not a transcription. — Inbound lots — Dock 4");
    expect(tables[0]?.headers).toEqual(["Lot", "Item", "Crates", "Temp °C"]);
    expect(tables[0]?.rows[0]).toEqual(["A-14", "Kelp flakes", "18", "4"]);
    expect(tables[0]?.rows[1]).toEqual(["", "Citrus oil", "6", "8"]);
    expect(tables[0]?.rows[2]).toEqual(["B-02", "Rye flour", "24", "16"]);
    expect(tables[0]?.footer[0]).toEqual(["Crate total", "", "48", ""]);
    expect(SAMPLE_LABEL.toLowerCase()).toContain("not model output");
    expect(LENGTH_WARNING.toLowerCase()).toContain("length");
    expect(LIVE_REQUIRED.startsWith("Live mode needed")).toBe(true);
  });
});
