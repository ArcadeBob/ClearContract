import { useState } from 'react';
import { Contract } from '../types/contract';
import { loadContracts, saveContracts } from '../storage/contractStorage';

export function useContractStore() {
  const [{ contracts: initialContracts, migrationWarning }] = useState(() => loadContracts());
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [isUploading, setIsUploading] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(migrationWarning ?? null);

  const persistAndSet = (updater: (prev: Contract[]) => Contract[]) => {
    setContracts((prev) => {
      const next = updater(prev);
      const result = saveContracts(next);
      if (!result.success) {
        setStorageWarning(result.error ?? 'Storage error');
      } else {
        setStorageWarning(null);
      }
      return next;
    });
  };

  const addContract = (contract: Contract) => {
    persistAndSet((prev) => [contract, ...prev]);
  };

  const updateContract = (id: string, updates: Partial<Contract>) => {
    persistAndSet((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteContract = (id: string) => {
    persistAndSet((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleFindingResolved = (contractId: string, findingId: string) => {
    persistAndSet((prev) =>
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
    persistAndSet((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              findings: c.findings.map((f) =>
                f.id === findingId ? { ...f, note } : f
              ),
            }
          : c
      )
    );
  };

  const dismissStorageWarning = () => setStorageWarning(null);

  return {
    contracts,
    isUploading,
    setIsUploading,
    addContract,
    updateContract,
    deleteContract,
    toggleFindingResolved,
    updateFindingNote,
    storageWarning,
    dismissStorageWarning,
  };
}
