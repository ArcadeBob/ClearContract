/** Token usage captured from streaming events per pass */
export interface PassUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

/** Result of a single pass with usage and timing */
export interface PassWithUsage {
  passName: string;
  result: unknown; // PassResult | RiskOverviewResult -- kept generic to avoid circular imports
  usage: PassUsage;
  durationMs: number;
}

/** Anthropic Claude Sonnet pricing (locked per CONTEXT.md) */
export const PRICING = {
  inputPerMillion: 3.00,
  outputPerMillion: 15.00,
  cacheWritePerMillion: 3.75,
  cacheReadPerMillion: 0.30,
} as const;
