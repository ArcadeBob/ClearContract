import type { PassUsage } from './types.js';
import { PRICING } from './types.js';

/**
 * Compute the USD cost of a single pass from its token usage.
 * Formula: (input * 3.00 + output * 15.00 + cache_creation * 3.75 + cache_read * 0.30) / 1_000_000
 */
export function computePassCost(usage: PassUsage): number {
  return (
    (usage.inputTokens * PRICING.inputPerMillion +
     usage.outputTokens * PRICING.outputPerMillion +
     usage.cacheCreationTokens * PRICING.cacheWritePerMillion +
     usage.cacheReadTokens * PRICING.cacheReadPerMillion) /
    1_000_000
  );
}
