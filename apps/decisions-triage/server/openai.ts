import OpenAI from "openai";

let constructions = 0;

export function createOpenAIClient(apiKey: string, baseURL?: string): OpenAI {
  constructions += 1;
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

export function openaiConstructionCount(): number {
  return constructions;
}

export function resetOpenAIConstructionCount(): void {
  constructions = 0;
}
