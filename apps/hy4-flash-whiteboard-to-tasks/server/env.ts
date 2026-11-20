import {
  DEFAULT_MODELS,
  OPENROUTER_BASE,
  TOKENHUB_GUANGZHOU_BASE,
  TOKENHUB_INTL_BASE,
} from "../shared/copy.ts";
import type { ProviderId } from "../shared/types.ts";

export function tokenhubKey(env: NodeJS.ProcessEnv): string | undefined {
  const value = env.TOKENHUB_API_KEY?.trim() || env.HUNYUAN_API_KEY?.trim() || env.HY4_FLASH_API_KEY?.trim();
  return value || undefined;
}

export function tokenhubRegion(env: NodeJS.ProcessEnv): "intl" | "guangzhou" {
  return env.TOKENHUB_REGION?.trim() === "guangzhou" ? "guangzhou" : "intl";
}

export function explicitProvider(env: NodeJS.ProcessEnv): ProviderId | null {
  const raw = env.HY4_FLASH_PROVIDER?.trim();
  if (raw === "tokenhub" || raw === "openrouter" || raw === "custom") return raw;
  return null;
}

export function isConfigured(provider: ProviderId, env: NodeJS.ProcessEnv): boolean {
  switch (provider) {
    case "tokenhub":
      return Boolean(tokenhubKey(env));
    case "openrouter":
      return Boolean(env.OPENROUTER_API_KEY?.trim());
    case "custom":
      return Boolean(env.HY4_FLASH_BASE_URL?.trim());
    default: {
      const unknown: never = provider;
      throw new Error(`Unknown provider ${String(unknown)}`);
    }
  }
}

export function configuredProviders(env: NodeJS.ProcessEnv): ProviderId[] {
  const providers: ProviderId[] = ["tokenhub", "openrouter", "custom"];
  return providers.filter((provider) => isConfigured(provider, env));
}

export function resolveMode(env: NodeJS.ProcessEnv): "live" | "mock" {
  if (env.MOCK === "1") return "mock";
  return configuredProviders(env).length > 0 ? "live" : "mock";
}

export function defaultProvider(env: NodeJS.ProcessEnv): ProviderId | null {
  const configured = configuredProviders(env);
  const explicit = explicitProvider(env);
  if (explicit && configured.includes(explicit)) return explicit;
  if (configured.includes("tokenhub")) return "tokenhub";
  return configured[0] ?? null;
}

export function trimBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function baseUrlFor(provider: ProviderId, env: NodeJS.ProcessEnv): string {
  const override = env.HY4_FLASH_BASE_URL?.trim();
  if (override) return trimBase(override);
  switch (provider) {
    case "tokenhub":
      return tokenhubRegion(env) === "guangzhou" ? TOKENHUB_GUANGZHOU_BASE : TOKENHUB_INTL_BASE;
    case "openrouter":
      return OPENROUTER_BASE;
    case "custom":
      throw new Error("HY4_FLASH_BASE_URL is required for a custom endpoint.");
    default: {
      const unknown: never = provider;
      throw new Error(`Unknown provider ${String(unknown)}`);
    }
  }
}

export function modelFor(provider: ProviderId, env: NodeJS.ProcessEnv): string {
  const override = env.HY4_FLASH_MODEL?.trim();
  if (override) return override;
  switch (provider) {
    case "tokenhub":
      return DEFAULT_MODELS.tokenhub;
    case "openrouter":
      return DEFAULT_MODELS.openrouter;
    case "custom":
      return DEFAULT_MODELS.custom;
    default: {
      const unknown: never = provider;
      throw new Error(`Unknown provider ${String(unknown)}`);
    }
  }
}

export function keyPresent(env: NodeJS.ProcessEnv): boolean {
  return configuredProviders(env).length > 0;
}
