import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { mapRows } from '../lib/mappers';

export interface AnalysisUsageRow {
  id: string;
  contractId: string;
  runId: string;
  passName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  durationMs: number;
  createdAt: string;
}

export function useAnalysisUsage(contractId: string) {
  const [rows, setRows] = useState<AnalysisUsageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('analysis_usage')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setRows([]);
        setIsLoading(false);
        return;
      }

      const mapped = mapRows<AnalysisUsageRow>(data);

      // costUsd comes back as string from Postgres numeric -- coerce to number
      mapped.forEach(r => { r.costUsd = Number(r.costUsd); });

      // Filter to latest run only
      const latestRunId = mapped[0].runId;
      const latestRun = mapped.filter(r => r.runId === latestRunId);

      setRows(latestRun);
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [contractId]);

  return { rows, isLoading };
}
