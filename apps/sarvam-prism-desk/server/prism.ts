import type { ResolvedEnv } from "./env";
import { deskQuestions } from "./questions";
import { mapSarvamError, sarvamResponseSchema, type SarvamResponse } from "./schema";

export const PRISM_AUTH_HEADER = "api-subscription-key";

const RETRY_STATUSES = new Set([429, 502, 503]);

export function buildRequest(text: string, model: string) {
  return {
    model,
    state: text,
    questions: deskQuestions(),
  };
}

export function authHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    [PRISM_AUTH_HEADER]: apiKey,
  };
}

export type PrismOk = {
  ok: true;
  serverMs: number;
  requestBody: ReturnType<typeof buildRequest>;
  response: SarvamResponse;
  requestId?: string;
};

export type PrismFail = {
  ok: false;
  serverMs: number;
  requestBody: ReturnType<typeof buildRequest>;
  raw: unknown;
  error: { status: number; code: string; message: string };
  requestId?: string;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function callPrism(
  text: string,
  opts: { env: ResolvedEnv; signal?: AbortSignal; fetchImpl?: typeof fetch },
): Promise<PrismOk | PrismFail> {
  const apiKey = opts.env.apiKey;
  if (!apiKey) throw new Error("SARVAM_API_KEY is not set");
  const requestBody = buildRequest(text, opts.env.model);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${opts.env.baseUrl}/v2/systemone`;
  let attempt = 0;
  let lastFail: PrismFail | undefined;

  while (attempt < 2) {
    const started = performance.now();
    const res = await fetchImpl(url, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify(requestBody),
      signal: opts.signal,
    });
    const serverMs = performance.now() - started;
    const raw: unknown = await res.json().catch(() => null);
    if (res.ok) {
      const parsed = sarvamResponseSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          serverMs,
          requestBody,
          raw,
          error: {
            status: 502,
            code: "invalid_response",
            message: "Sarvam response did not match the hosted API shape",
          },
        };
      }
      return { ok: true, serverMs, requestBody, response: parsed.data };
    }

    const mapped = mapSarvamError(res.status, raw);
    if (mapped.requestId) console.info(`sarvam request_id=${mapped.requestId}`);
    lastFail = {
      ok: false,
      serverMs,
      requestBody,
      raw,
      requestId: mapped.requestId,
      error: { status: mapped.status, code: mapped.code, message: mapped.message },
    };
    const canRetry = RETRY_STATUSES.has(res.status) && attempt === 0 && !opts.signal?.aborted;
    if (!canRetry) return lastFail;
    attempt += 1;
    await sleep(300, opts.signal);
  }

  return lastFail ?? {
    ok: false,
    serverMs: 0,
    requestBody,
    raw: null,
    error: { status: 500, code: "unknown_error", message: "Sarvam request failed" },
  };
}
