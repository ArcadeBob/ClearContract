import { useState } from 'react';
import { Contract, ViewState } from '../types/contract';
import { loadContracts, saveContracts } from '../storage/contractStorage';

export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const { contracts } = loadContracts();
    return contracts;
  });
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isUploading, setIsUploading] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const activeContract =
    contracts.find((c) => c.id === activeContractId) || null;

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

  const navigateTo = (view: ViewState, contractId?: string) => {
    setActiveView(view);
    setActiveContractId(contractId ?? null);
  };

  return {
    contracts,
    activeContract,
    activeView,
    isUploading,
    setIsUploading,
    addContract,
    updateContract,
    deleteContract,
    navigateTo,
    storageWarning,
    dismissStorageWarning,
  };
}
