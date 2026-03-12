import { useState } from 'react';
import { Contract } from '../types/contract';
import { loadContracts, saveContracts } from '../storage/contractStorage';

export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const { contracts } = loadContracts();
    return contracts;
  });
  const [isUploading, setIsUploading] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

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

  const dismissStorageWarning = () => setStorageWarning(null);

  return {
    contracts,
    isUploading,
    setIsUploading,
    addContract,
    updateContract,
    deleteContract,
    storageWarning,
    dismissStorageWarning,
  };
}
