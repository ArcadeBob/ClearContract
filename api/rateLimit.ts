import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_ANALYSES_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if the user has exceeded the analysis rate limit.
 * Uses the analysis_usage table (one row per pass per analysis run)
 * and counts distinct run_id values within the window.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  // Count distinct analysis runs (run_id) in the last hour for this user
  const { data, error } = await supabase
    .from('analysis_usage')
    .select('run_id', { count: 'exact', head: false })
    .eq('user_id', userId)
    .gte('created_at', windowStart)
    .limit(1000);

  if (error) {
    // Fail open — don't block users if the rate limit check itself fails
    console.error('[rateLimit] Check failed, allowing request:', error.message);
    return { allowed: true };
  }

  const distinctRuns = new Set((data ?? []).map(r => r.run_id)).size;

  if (distinctRuns >= MAX_ANALYSES_PER_HOUR) {
    // Estimate when the oldest run in the window will expire
    const retryAfterSeconds = Math.ceil(WINDOW_MS / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}
