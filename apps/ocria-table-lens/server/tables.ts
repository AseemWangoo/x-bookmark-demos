import type { TableGrid } from "../shared/types.ts";
import { extractTableHtml } from "./markdown.ts";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const MAX_SPAN = 64;

type Section = "thead" | "tbody" | "tfoot";

type RawCell = {
  text: string;
  colspan: number;
  rowspan: number;
  header: boolean;
};

type RawRow = {
  section: Section;
  cells: RawCell[];
};

/**
 * Flattening rule:
 * Each td/th occupies a rectangle of colspan by rowspan (each axis at least 1,
 * capped at 64). The cell text is written only into the top-left cell of that
 * rectangle. Every other cell in the rectangle is an empty string. Rows are
 * padded so the grid is rectangular. This does not invent duplicate values
 * for a merged cell.
 * thead rows are headers. When there is more than one, the last thead row is
 * the column header and earlier thead rows become the caption (non-empty
 * cells, in reading order). A colspan title therefore does not become several
 * sortable columns.
 * If there is no thead, the first row is a header only when every cell in it
 * is a th. Otherwise headers are "Column N" and headerNote says so.
 * tfoot rows are returned separately and are not part of the sortable body.
 * br becomes a newline. script and style contents are dropped. Other tags
 * inside a cell are stripped. Entities are decoded.
 */
export function parseHtmlTable(html: string, index: number): TableGrid | null {
  const rows = scanRows(html);
  if (rows.length === 0) return null;
  const placed = place(rows);
  if (placed.columns === 0) return null;

  const captionText = captionOf(html);
  const theadCount = rows.filter((row) => row.section === "thead").length;
  let headerCount = theadCount;
  if (headerCount === 0 && rows[0] && rows[0].cells.length > 0 && rows[0].cells.every((cell) => cell.header)) {
    headerCount = 1;
  }

  const headerRows = placed.grid.slice(0, headerCount);
  const bodyAndFooter = placed.sections.slice(headerCount);
  const body: string[][] = [];
  const footer: string[][] = [];
  for (let i = 0; i < bodyAndFooter.length; i += 1) {
    const section = bodyAndFooter[i];
    const cells = placed.grid[headerCount + i] ?? [];
    if (section === "tfoot") footer.push(cells);
    else body.push(cells);
  }

  let headers: string[];
  let headerNote: string | null = null;
  let caption = captionText;
  if (headerRows.length === 0) {
    headers = Array.from({ length: placed.columns }, (_, column) => `Column ${column + 1}`);
    headerNote = "No header cells; columns are labelled Column N.";
  } else {
    const titleRows = headerRows.slice(0, -1);
    const last = headerRows[headerRows.length - 1] ?? [];
    headers = pad(last, placed.columns);
    const title = titleRows
      .flat()
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    const spanning = title.join(" · ");
    const parts = [captionText, spanning].filter((part): part is string => typeof part === "string" && part.length > 0);
    caption = parts.join(" — ") || null;
  }

  return {
    index,
    caption,
    headers,
    headerNote,
    rows: body.map((row) => pad(row, placed.columns)),
    footer: footer.map((row) => pad(row, placed.columns)),
  };
}

export function parseMarkdownTables(markdown: string): TableGrid[] {
  const tables: TableGrid[] = [];
  for (const html of extractTableHtml(markdown)) {
    const table = parseHtmlTable(html, tables.length);
    if (table) tables.push(table);
  }
  return tables;
}

function captionOf(html: string): string | null {
  const match = /<caption\b[^>]*>([\s\S]*?)<\/caption>/i.exec(html);
  if (!match) return null;
  const text = normalizeCell(stripTags(match[1] ?? ""));
  return text.length > 0 ? text : null;
}

function scanRows(html: string): RawRow[] {
  const rows: RawRow[] = [];
  let section: Section = "tbody";
  let row: RawRow | null = null;
  let cell: { header: boolean; colspan: number; rowspan: number; parts: string[] } | null = null;
  let skip: "script" | "style" | null = null;
  const pattern = /<\/?([a-zA-Z][\w:-]*)([^>]*)\/?>|([^<]+)/g;

  for (const match of html.matchAll(pattern)) {
    const name = (match[1] ?? "").toLowerCase();
    const rawAttrs = match[2] ?? "";
    const text = match[3];
    const isClose = match[0].startsWith("</");
    const selfClosing = match[0].endsWith("/>") || name === "br";

    if (text !== undefined) {
      if (!skip && cell) cell.parts.push(decodeEntities(text));
      continue;
    }
    if (!name) continue;
    if (skip) {
      if (isClose && name === skip) skip = null;
      continue;
    }
    if (!isClose && (name === "script" || name === "style")) {
      skip = name;
      continue;
    }
    if (!isClose && (name === "thead" || name === "tbody" || name === "tfoot")) {
      section = name;
      continue;
    }
    if (!isClose && name === "tr") {
      row = { section, cells: [] };
      rows.push(row);
      continue;
    }
    if (isClose && name === "tr") {
      row = null;
      continue;
    }
    if (!isClose && (name === "td" || name === "th")) {
      const attrs = attributes(rawAttrs);
      if (!row) {
        row = { section, cells: [] };
        rows.push(row);
      }
      cell = {
        header: name === "th",
        colspan: span(attrs.colspan),
        rowspan: span(attrs.rowspan),
        parts: [],
      };
      if (selfClosing) finishCell();
      continue;
    }
    if (!isClose && name === "br") {
      if (cell) cell.parts.push("\n");
      continue;
    }
    if (isClose && (name === "td" || name === "th")) finishCell();
  }

  function finishCell(): void {
    if (!cell || !row) {
      cell = null;
      return;
    }
    row.cells.push({
      text: normalizeCell(cell.parts.join("")),
      colspan: cell.colspan,
      rowspan: cell.rowspan,
      header: cell.header,
    });
    cell = null;
  }

  return rows.filter((item) => item.cells.length > 0);
}

function place(rows: RawRow[]): { grid: string[][]; sections: Section[]; columns: number } {
  const grid: string[][] = [];
  const occupied: boolean[][] = [];
  const sections: Section[] = [];

  const ensure = (rowIndex: number, column: number, section: Section) => {
    while (grid.length <= rowIndex) {
      grid.push([]);
      occupied.push([]);
      sections.push(section);
    }
    const line = grid[rowIndex];
    const flags = occupied[rowIndex];
    if (!line || !flags) return;
    while (line.length <= column) {
      line.push("");
      flags.push(false);
    }
  };

  rows.forEach((row, rowIndex) => {
    let column = 0;
    for (const cell of row.cells) {
      ensure(rowIndex, column, row.section);
      while (occupied[rowIndex]?.[column]) column += 1;
      for (let dy = 0; dy < cell.rowspan; dy += 1) {
        for (let dx = 0; dx < cell.colspan; dx += 1) {
          ensure(rowIndex + dy, column + dx, dy === 0 ? row.section : (sections[rowIndex + dy] ?? row.section));
          const flags = occupied[rowIndex + dy];
          const line = grid[rowIndex + dy];
          if (!flags || !line) continue;
          flags[column + dx] = true;
          line[column + dx] = dy === 0 && dx === 0 ? cell.text : "";
        }
      }
      column += cell.colspan;
    }
  });

  const columns = grid.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    grid: grid.map((line) => pad(line, columns)),
    sections,
    columns,
  };
}

function pad(row: string[], columns: number): string[] {
  const next = row.slice(0, columns);
  while (next.length < columns) next.push("");
  return next;
}

function span(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(Math.floor(parsed), MAX_SPAN);
}

function attributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const pattern = /([a-zA-Z_:][\w:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of raw.matchAll(pattern)) {
    const key = (match[1] ?? "").toLowerCase();
    if (!key) continue;
    out[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return out;
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? safeCodePoint(code, entity) : entity;
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? safeCodePoint(code, entity) : entity;
    }
    return NAMED_ENTITIES[body] ?? entity;
  });
}

function safeCodePoint(code: number, fallback: string): string {
  if (code < 0 || code > 0x10ffff) return fallback;
  return String.fromCodePoint(code);
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

function normalizeCell(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}
