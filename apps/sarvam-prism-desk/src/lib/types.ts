export const LANGS = ["en", "hinglish", "hi", "ta", "bn", "te", "mr"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  hinglish: "Hinglish",
  hi: "हिन्दी",
  ta: "தமிழ்",
  bn: "বাংলা",
  te: "తెలుగు",
  mr: "मराठी",
};

export const TEAMS = [
  "payments",
  "technical",
  "account_kyc",
  "orders_delivery",
  "sales",
] as const;
export type TeamId = (typeof TEAMS)[number];

export const TEAM_LABEL: Record<TeamId, string> = {
  payments: "Payments",
  technical: "Technical",
  account_kyc: "Account & KYC",
  orders_delivery: "Orders & delivery",
  sales: "Sales",
};

export const URGENCY_LEVELS = ["low", "normal", "high", "critical"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export type RoutingResult = {
  team: {
    choice: string;
    pTop: number;
    confidence: number;
    probabilities: Record<string, number>;
  };
  urgency: {
    score: number;
    level: number;
    label: string;
    confidence: number;
    probabilities: Record<string, number>;
    legend: Record<string, string>;
  };
  escalate: {
    pYes: number;
    verdict: "yes" | "no";
  };
};

export type RouteSource = "live" | "fixture" | "mock-heuristic";

export type RouteOk = {
  mode: "mock" | "live";
  model: string;
  result: RoutingResult;
  raw: { request: unknown; response: unknown };
  serverMs: number;
  usage: { input_tokens: number; output_tokens: number };
  costInr: number;
  synthetic: boolean;
  source: RouteSource;
  requestId?: string;
};

export type RouteErr = {
  error: { status: number; code: string; message: string };
};

export type ModeInfo = {
  mode: "mock" | "live";
  model: string;
  autoThreshold: number;
};

export type LangChip = {
  choice: string;
  pTop: number;
  ms: number;
};
