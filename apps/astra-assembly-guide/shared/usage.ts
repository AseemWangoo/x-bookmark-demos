export type Usage = {
  inputTokens: number;
  cachedTokens: number;
  cacheWrite30mTokens: number;
  cacheWrite12hTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimated: boolean;
};
