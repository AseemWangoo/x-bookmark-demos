import type { Lang } from "../src/lib/types";
import { PRISM_AUTH_HEADER } from "./prism";
import type { ResolvedEnv } from "./env";

const TARGET: Record<Lang, string | null> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  bn: "bn-IN",
  te: "te-IN",
  mr: "mr-IN",
  hinglish: null,
};

export function mayuraTarget(lang: Lang): string | null {
  return TARGET[lang];
}

export async function translateText(
  text: string,
  targetLang: Lang,
  opts: { env: ResolvedEnv; signal?: AbortSignal; fetchImpl?: typeof fetch },
): Promise<{ translatedText: string } | { error: { status: number; code: string; message: string } }> {
  const target = mayuraTarget(targetLang);
  if (!target) {
    return {
      error: {
        status: 400,
        code: "unsupported_language",
        message: "Mayura has no Hinglish target code",
      },
    };
  }
  if (!opts.env.apiKey) {
    return {
      error: {
        status: 400,
        code: "mock_mode",
        message: "Translations of your own text need live mode",
      },
    };
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(`${opts.env.baseUrl}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [PRISM_AUTH_HEADER]: opts.env.apiKey,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: "auto",
      target_language_code: target,
      model: "mayura:v1",
    }),
    signal: opts.signal,
  });
  const raw: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      error: {
        status: res.status,
        code: "translate_failed",
        message: "Translation failed",
      },
    };
  }
  const translated =
    typeof raw === "object" && raw !== null && "translated_text" in raw
      ? String(raw.translated_text)
      : "";
  if (!translated) {
    return {
      error: { status: 502, code: "invalid_response", message: "Mayura returned no translated_text" },
    };
  }
  return { translatedText: translated };
}
