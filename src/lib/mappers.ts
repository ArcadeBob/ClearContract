/**
 * Generic snake_case-to-camelCase row mapper for Supabase Postgres rows.
 *
 * Converts top-level keys only. JSONB columns (score_breakdown, bid_signal,
 * pass_results, etc.) pass through unchanged because they are stored as
 * camelCase JSON in Postgres.
 */

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function mapRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value === null ? undefined : value;
  }
  return result as T;
}

export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => mapRow<T>(row));
}
