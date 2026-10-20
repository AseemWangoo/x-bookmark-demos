export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  streaming: boolean;
  error?: string;
};

export type PlannerMode = "mock" | "live";
