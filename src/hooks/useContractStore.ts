import { useState, useEffect } from 'react';
import { Contract } from '../types/contract';
import type { Finding, ContractDate } from '../types/contract';
import { supabase } from '../lib/supabase';
import { mapRow, mapRows } from '../lib/mappers';

export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const [contractsRes, findingsRes, datesRes] = await Promise.all([
        supabase.from('contracts').select('*'),
        supabase.from('findings').select('*'),
        supabase.from('contract_dates').select('*'),
      ]);

      if (contractsRes.error) throw new Error(`Failed to load contracts: ${contractsRes.error.message}`);
      if (findingsRes.error) throw new Error(`Failed to load findings: ${findingsRes.error.message}`);
      if (datesRes.error) throw new Error(`Failed to load dates: ${datesRes.error.message}`);

      const contractList = mapRows<Contract & { findings: never; dates: never }>(contractsRes.data);

      // Build lookup maps for stitching
      const findingsByContract = new Map<string, Finding[]>();
      for (const row of findingsRes.data) {
        const finding = mapRow<Finding & { contractId: string }>(row);
        const list = findingsByContract.get(finding.contractId) || [];
        list.push(finding);
        findingsByContract.set(finding.contractId, list);
      }

      const datesByContract = new Map<string, ContractDate[]>();
      for (const row of datesRes.data) {
        const d = mapRow<ContractDate & { contractId: string }>(row);
        const list = datesByContract.get(d.contractId) || [];
        list.push(d);
        datesByContract.set(d.contractId, list);
      }

      // Stitch findings and dates onto contracts (silently drop orphans per CONTEXT decision)
      return contractList.map((c) => ({
        ...c,
        findings: findingsByContract.get(c.id) || [],
        dates: datesByContract.get(c.id) || [],
      }));
    }

    fetchAll()
      .then((data) => {
        if (!cancelled) {
          setContracts(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load contracts');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const addContract = (contract: Contract) => {
    setContracts((prev) => [contract, ...prev]);
  };

  const updateContract = (id: string, updates: Partial<Contract>) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteContract = (id: string) => {
    setContracts((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleFindingResolved = (contractId: string, findingId: string) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              findings: c.findings.map((f) =>
                f.id === findingId ? { ...f, resolved: !f.resolved } : f
              ),
            }
          : c
      )
    );
  };

  const updateFindingNote = (contractId: string, findingId: string, note: string | undefined) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              findings: c.findings.map((f) =>
                f.id === findingId ? { ...f, note: note ?? '' } : f
              ),
            }
          : c
      )
    );
  };

  return {
    contracts,
    isLoading,
    error,
    isUploading,
    setIsUploading,
    addContract,
    updateContract,
    deleteContract,
    toggleFindingResolved,
    updateFindingNote,
  };
}
