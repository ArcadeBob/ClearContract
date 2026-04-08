import { useState, useEffect, useCallback } from 'react';
import { Contract } from '../types/contract';
import type { Finding, ContractDate, LifecycleStatus } from '../types/contract';
import { supabase } from '../lib/supabase';
import { mapRow, mapRows } from '../lib/mappers';
import { useToast } from './useToast';
import { optimisticMutation } from '../utils/optimisticMutation';

export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // ── Data fetching ─────────────────────────────────────────────────────

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

  // ── Contract CRUD ─────────────────────────────────────────────────────

  const addContract = useCallback((contract: Contract) => {
    setContracts((prev) => [contract, ...prev]);
  }, []);

  const updateContract = useCallback((id: string, updates: Partial<Contract>) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteContract = useCallback(async (id: string) => {
    await optimisticMutation(
      contracts,
      setContracts,
      () => setContracts((c) => c.filter((x) => x.id !== id)),
      { table: 'contracts', id, isDelete: true, errorMessage: 'Failed to delete contract.' },
      showToast,
    );
  }, [contracts, showToast]);

  // ── Finding mutations ─────────────────────────────────────────────────

  const updateFinding = useCallback(async (
    contractId: string,
    findingId: string,
    patch: Partial<Finding>,
    errorMessage: string,
  ) => {
    await optimisticMutation(
      contracts,
      setContracts,
      () => setContracts((cs) =>
        cs.map((c) =>
          c.id === contractId
            ? { ...c, findings: c.findings.map((f) =>
                f.id === findingId ? { ...f, ...patch } : f
              )}
            : c
        )
      ),
      { table: 'findings', id: findingId, updates: patch, errorMessage },
      showToast,
    );
  }, [contracts, showToast]);

  const toggleFindingResolved = useCallback(async (contractId: string, findingId: string) => {
    const finding = contracts.find((c) => c.id === contractId)?.findings.find((f) => f.id === findingId);
    if (!finding) return;
    await updateFinding(contractId, findingId, { resolved: !finding.resolved }, 'Failed to update finding.');
  }, [contracts, updateFinding]);

  const updateFindingNote = useCallback(async (contractId: string, findingId: string, note: string | undefined) => {
    await updateFinding(contractId, findingId, { note: note ?? '' }, 'Failed to save note.');
  }, [updateFinding]);

  // ── Contract metadata ─────────────────────────────────────────────────

  const renameContract = useCallback(async (id: string, name: string) => {
    await optimisticMutation(
      contracts,
      setContracts,
      () => setContracts((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c))),
      { table: 'contracts', id, updates: { name }, errorMessage: 'Failed to rename contract.' },
      showToast,
    );
  }, [contracts, showToast]);

  const updateLifecycleStatus = useCallback(async (id: string, lifecycleStatus: LifecycleStatus) => {
    await optimisticMutation(
      contracts,
      setContracts,
      () => setContracts((cs) => cs.map((c) => (c.id === id ? { ...c, lifecycleStatus } : c))),
      { table: 'contracts', id, updates: { lifecycle_status: lifecycleStatus }, errorMessage: 'Failed to update status.' },
      showToast,
    );
  }, [contracts, showToast]);

  return {
    contracts,
    isLoading,
    error,
    addContract,
    updateContract,
    deleteContract,
    toggleFindingResolved,
    updateFindingNote,
    renameContract,
    updateLifecycleStatus,
  };
}
