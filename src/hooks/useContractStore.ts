import { useState } from 'react';
import { Contract, ViewState } from '../types/contract';
import { MOCK_CONTRACTS } from '../data/mockContracts';

export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isUploading, setIsUploading] = useState(false);

  const activeContract =
  contracts.find((c) => c.id === activeContractId) || null;

  const addContract = (contract: Contract) => {
    setContracts((prev) => [contract, ...prev]);
  };

  const updateContract = (id: string, updates: Partial<Contract>) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const navigateTo = (view: ViewState, contractId?: string) => {
    setActiveView(view);
    if (contractId) {
      setActiveContractId(contractId);
    }
  };

  return {
    contracts,
    activeContract,
    activeView,
    isUploading,
    setIsUploading,
    addContract,
    updateContract,
    navigateTo,
    setActiveContractId
  };
}