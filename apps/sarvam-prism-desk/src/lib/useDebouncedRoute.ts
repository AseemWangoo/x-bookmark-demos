import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { presetById } from "../../fixtures/presets";
import { matchPreset } from "./match";
import { nonSpaceLength } from "./text";
import type { Lang, LangChip, ModeInfo, RouteErr, RouteOk } from "./types";

const DEBOUNCE_MS = 200;

function isRouteErr(value: RouteOk | RouteErr): value is RouteErr {
  return "error" in value;
}

export function useDebouncedRoute() {
  const [text, setText] = useState("");
  const [modeInfo, setModeInfo] = useState<ModeInfo>({
    mode: "mock",
    model: "sarvam-prism",
    autoThreshold: 0.9,
  });
  const [forceMock, setForceMock] = useState(false);
  const [threshold, setThreshold] = useState(0.9);
  const [pending, setPending] = useState(false);
  const [route, setRoute] = useState<RouteOk | null>(null);
  const [e2eMs, setE2eMs] = useState<number | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [chips, setChips] = useState<Partial<Record<Lang, LangChip>>>({});
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const seq = useRef(0);
  const chipPreset = useRef<string | null>(null);
  const forceRef = useRef(false);
  const textRef = useRef("");

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch("/api/mode", { signal: ctrl.signal })
      .then((res) => res.json() as Promise<ModeInfo>)
      .then((data) => {
        setModeInfo(data);
        if (typeof data.autoThreshold === "number") setThreshold(data.autoThreshold);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  const run = useCallback((nextText: string, explicitLang?: Lang) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (nonSpaceLength(nextText) < 6) {
      abortRef.current?.abort();
      seq.current += 1;
      setPending(false);
      setRoute(null);
      setE2eMs(null);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const id = seq.current + 1;
    seq.current = id;
    setPending(true);
    const started = performance.now();
    const match = matchPreset(nextText);
    const lang = explicitLang ?? match?.lang;
    const presetId = match?.id;
    void fetch("/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: nextText,
        lang,
        presetId,
        forceMock: forceRef.current,
      }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as RouteOk | RouteErr;
        if (id !== seq.current) return;
        if (!res.ok || isRouteErr(data)) {
          const message = isRouteErr(data) ? data.error.message : "Route failed";
          toast.error(message);
          return;
        }
        setRoute(data);
        setE2eMs(performance.now() - started);
        setSamples((prev) => [...prev, data.serverMs].slice(-30));
        const nextPreset = presetId ?? null;
        setChips((prev) => {
          const base = nextPreset !== chipPreset.current ? {} : prev;
          if (!lang) return base;
          return {
            ...base,
            [lang]: {
              choice: data.result.team.choice,
              pTop: data.result.team.pTop,
              ms: data.serverMs,
            },
          };
        });
        chipPreset.current = nextPreset;
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (id !== seq.current) return;
        toast.error(error instanceof Error ? error.message : "Route failed");
      })
      .finally(() => {
        if (id === seq.current) setPending(false);
      });
  }, []);

  const onType = useCallback(
    (next: string) => {
      textRef.current = next;
      setText(next);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => run(next), DEBOUNCE_MS);
    },
    [run],
  );

  const routeNow = useCallback(
    (next: string, explicitLang?: Lang) => {
      textRef.current = next;
      setText(next);
      run(next, explicitLang);
    },
    [run],
  );

  const onForceMock = useCallback(
    (checked: boolean) => {
      forceRef.current = checked;
      setForceMock(checked);
      if (nonSpaceLength(textRef.current) >= 6) run(textRef.current);
    },
    [run],
  );

  const applyLang = useCallback(
    async (lang: Lang) => {
      const match = matchPreset(textRef.current);
      if (match) {
        const preset = presetById(match.id);
        if (!preset) return;
        routeNow(preset.variants[lang], lang);
        return;
      }
      if (modeInfo.mode === "mock" || forceRef.current) return;
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: textRef.current, targetLang: lang }),
      });
      const data = (await res.json()) as { translatedText?: string; error?: { message: string } };
      if (!res.ok || !data.translatedText) {
        toast.error(data.error?.message ?? "Translation failed");
        return;
      }
      routeNow(data.translatedText, lang);
    },
    [modeInfo.mode, routeNow],
  );

  return {
    text,
    onType,
    routeNow,
    applyLang,
    modeInfo,
    forceMock,
    onForceMock,
    threshold,
    setThreshold,
    pending,
    route,
    e2eMs,
    samples,
    chips,
  };
}
