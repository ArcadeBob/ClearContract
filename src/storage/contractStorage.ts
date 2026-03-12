import { Contract } from '../types/contract';
import { MOCK_CONTRACTS } from '../data/mockContracts';

export const CONTRACTS_STORAGE_KEY = 'clearcontract:contracts';
export const SEEDED_KEY = 'clearcontract:contracts-seeded';

/**
 * Load contracts from localStorage.
 * On first visit, seeds mock contracts automatically.
 * Standalone function (not hook-dependent) following profileLoader.ts pattern.
 */
export function loadContracts(): {
  contracts: Contract[];
  fromStorage: boolean;
} {
  try {
    const stored = localStorage.getItem(CONTRACTS_STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return { contracts: parsed, fromStorage: true };
      }
    }

    // No valid stored data — check if we've seeded before
    const seeded = localStorage.getItem(SEEDED_KEY);

    if (!seeded) {
      // First visit: seed with mock contracts
      saveContracts(MOCK_CONTRACTS);
      localStorage.setItem(SEEDED_KEY, 'true');
      return { contracts: MOCK_CONTRACTS, fromStorage: false };
    }

    // Seeded before but data was cleared — return empty
    return { contracts: [], fromStorage: true };
  } catch {
    // localStorage unavailable, parse failure, etc.
    return { contracts: [], fromStorage: false };
  }
}

/**
 * Persist contracts array to localStorage.
 * Returns success status; on quota exceeded, returns a user-friendly error.
 */
export function saveContracts(contracts: Contract[]): {
  success: boolean;
  error?: string;
} {
  try {
    localStorage.setItem(
      CONTRACTS_STORAGE_KEY,
      JSON.stringify(contracts)
    );
    return { success: true };
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      return {
        success: false,
        error:
          'Storage is full. Your contracts are safe in memory but will not persist after refresh.',
      };
    }
    return { success: false, error: 'Could not save to browser storage.' };
  }
}
