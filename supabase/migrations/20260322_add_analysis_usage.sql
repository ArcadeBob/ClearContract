-- Migration: Add analysis_usage table and 'Partial' contract status
-- Phase 51: Analysis Pipeline Parallelization and Token Capture

-- 1. Extend contracts.status CHECK constraint to include 'Partial'
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('Analyzing', 'Reviewed', 'Draft', 'Partial'));

-- 2. Create analysis_usage table (one row per pass per analysis run)
CREATE TABLE analysis_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  run_id uuid NOT NULL,
  pass_name text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cache_creation_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes for common query patterns
CREATE INDEX idx_analysis_usage_contract_id ON analysis_usage(contract_id);
CREATE INDEX idx_analysis_usage_user_id ON analysis_usage(user_id);
CREATE INDEX idx_analysis_usage_run_id ON analysis_usage(run_id);

-- 4. Row Level Security
ALTER TABLE analysis_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis_usage"
  ON analysis_usage FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own analysis_usage"
  ON analysis_usage FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own analysis_usage"
  ON analysis_usage FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 5. Grant service_role full access (bypasses RLS -- needed for server-side writes via supabaseAdmin)
GRANT ALL ON analysis_usage TO service_role;
