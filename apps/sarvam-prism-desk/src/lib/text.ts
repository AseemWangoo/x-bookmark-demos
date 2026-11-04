/** NFC, trim, collapse whitespace. Shared by fixture hashing and preset matching. */
export function normalizeText(text: string): string {
  return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function nonSpaceLength(text: string): number {
  return text.replace(/\s/g, "").length;
}
