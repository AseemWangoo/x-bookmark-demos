import { PRESETS } from "../../fixtures/presets";
import { LANGS, type Lang } from "./types";
import { normalizeText } from "./text";

export function matchPreset(text: string): { id: string; lang: Lang } | null {
  const key = normalizeText(text);
  if (!key) return null;
  for (const preset of PRESETS) {
    for (const lang of LANGS) {
      if (normalizeText(preset.variants[lang]) === key) return { id: preset.id, lang };
    }
  }
  return null;
}
