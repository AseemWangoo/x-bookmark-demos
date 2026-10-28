function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface ObjectTable {
  key: string;
  rows: Record<string, unknown>[];
}

export function objectRows(value: unknown): ObjectTable[] {
  if (Array.isArray(value) && value.every(isPlainObject)) {
    return [{ key: "result", rows: value }];
  }
  if (!isPlainObject(value)) return [];
  const tables: ObjectTable[] = [];
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child) && child.every(isPlainObject)) {
      tables.push({ key, rows: child });
    }
  }
  return tables;
}

export function primaryRowCount(value: unknown): number {
  const tables = objectRows(value);
  return tables[0]?.rows.length ?? 0;
}
