import { useState, useRef, useCallback } from 'react';
import { Contract, Finding, ViewState } from '../types/contract';
import { supabase } from '../lib/supabase';
import { analyzeContract } from '../api/analyzeContract';
import type { ReAnalyzeResult } from '../components/ReAnalyzeModal';
import { classifyError } from '../utils/errors';
import { useToast } from './useToast';

interface UseContractAnalysisOptions {
  contracts: Contract[];
  addContract: (contract: Contract) => void;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  navigateTo: (view: ViewState, contractId?: string) => void;
  activeViewRef: React.RefObject<ViewState>;
}

export function useContractAnalysis({
  contracts,
  addContract,
  updateContract,
  navigateTo,
  activeViewRef,
}: UseContractAnalysisOptions) {
  const { showToast } = useToast();
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzingHasBid, setAnalyzingHasBid] = useState(false);
  const pendingFileRef = useRef<File | null>(null);

  const handleUploadComplete = useCallback(async (file: File, bidFile?: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      showToast({ type: 'error', message: 'Please sign in to analyze contracts.' });
      return;
    }

    pendingFileRef.current = file;
    setAnalyzingId('pending');
    setAnalyzingHasBid(!!bidFile);

    try {
      const contract = await analyzeContract(file, session.access_token, undefined, bidFile);
      addContract(contract);

      if (activeViewRef.current === 'upload') {
        navigateTo('review', contract.id);
      } else {
        showToast({
          type: 'success',
          message: 'Analysis complete',
          actionLabel: 'View Contract',
          onRetry: () => navigateTo('review', contract.id),
        });
      }
    } catch (err) {
      const classified = classifyError(err);
      const hasRetryAfter = !!(err as Error & { retryAfterSeconds?: number })?.retryAfterSeconds;
      showToast({
        type: 'error',
        message: classified.userMessage,
        ...(classified.retryable && !hasRetryAfter ? {
          onRetry: () => {
            if (pendingFileRef.current) {
              handleUploadComplete(pendingFileRef.current);
            }
          },
        } : {}),
      });
    } finally {
      setAnalyzingId(null);
      setAnalyzingHasBid(false);
      pendingFileRef.current = null;
    }
  }, [addContract, navigateTo, activeViewRef, showToast]);

  const handleReanalyze = useCallback(async (contractId: string, reanalyzeResult: ReAnalyzeResult) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      showToast({ type: 'error', message: 'Please sign in to analyze contracts.' });
      return;
    }

    const snapshot = structuredClone(contract);
    setReanalyzingId(contractId);

    try {
      const analysisResult = await analyzeContract(
        reanalyzeResult.contractFile || new File([], contract.name || 'contract.pdf'),
        session.access_token,
        contractId,
        reanalyzeResult.bidFile,
        {
          keepCurrentContract: reanalyzeResult.keepCurrentContract,
          removeBid: reanalyzeResult.removeBid,
        }
      );

      // Match findings by clauseReference + category to preserve user edits (resolved/note) across re-analyses
      const oldByKey = new Map<string, Finding>();
      for (const f of contract.findings) {
        if (f.resolved || f.note) {
          const ref = f.clauseReference;
          if (ref && ref !== 'N/A' && ref !== 'Not Found') {
            oldByKey.set(`${ref}::${f.category}`, f);
          }
        }
      }

      // Carry over resolved/note to matching new findings
      let preservedResolved = 0;
      let preservedNotes = 0;
      const mergedFindings = analysisResult.findings.map((newFinding: Finding) => {
        const ref = newFinding.clauseReference;
        if (ref && ref !== 'N/A' && ref !== 'Not Found') {
          const old = oldByKey.get(`${ref}::${newFinding.category}`);
          if (old) {
            if (old.resolved) preservedResolved++;
            if (old.note) preservedNotes++;
            return { ...newFinding, resolved: old.resolved, note: old.note };
          }
        }
        return newFinding;
      });

      updateContract(contractId, {
        ...analysisResult,
        findings: mergedFindings,
      });

      // Write preserved resolved/note values back to Supabase
      const findingsToPreserve = mergedFindings.filter(
        (f: Finding) => f.resolved || (f.note && f.note !== '')
      );

      if (findingsToPreserve.length > 0) {
        const preserveWrites = await Promise.all(
          findingsToPreserve.map((f: Finding) =>
            supabase
              .from('findings')
              .update({ resolved: f.resolved, note: f.note || '' })
              .eq('id', f.id)
          )
        );

        const failures = preserveWrites.filter((r) => r.error);
        if (failures.length > 0) {
          console.error(
            'Some finding preservation writes failed:',
            failures.map((r) => r.error)
          );
        }
      }

      const preserveMsg =
        preservedResolved > 0 || preservedNotes > 0
          ? `Re-analysis complete. ${preservedResolved} resolved + ${preservedNotes} notes preserved.`
          : 'Analysis complete \u2014 findings updated.';

      showToast({ type: 'success', message: preserveMsg });
    } catch (err) {
      updateContract(contractId, snapshot);

      const classified = classifyError(err);
      const hasRetryAfter = !!(err as Error & { retryAfterSeconds?: number })?.retryAfterSeconds;
      showToast({
        type: 'error',
        message: classified.userMessage + ' Your previous findings are unchanged.',
        ...(classified.retryable && !hasRetryAfter ? {
          onRetry: () => handleReanalyze(contractId, reanalyzeResult),
        } : {}),
      });
    } finally {
      setReanalyzingId(null);
    }
  }, [contracts, updateContract, showToast]);

  return {
    analyzingId,
    analyzingHasBid,
    reanalyzingId,
    handleUploadComplete,
    handleReanalyze,
  };
}
