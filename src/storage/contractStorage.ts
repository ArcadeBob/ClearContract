import { Contract } from '../types/contract';
import { MOCK_CONTRACTS } from '../data/mockContracts';
import { load, save, loadRaw, saveRaw } from './storageManager';

const CURRENT_SCHEMA_VERSION = 2;

/**
 * Migrate contracts from older schema versions to current.
 * Fills in newly-required fields with safe defaults.
 */
function migrateContracts(contracts: unknown[], fromVersion: number): Contract[] {
  return contracts.map(c => {
    const contract = { ...(c as Record<string, unknown>) };
    if (fromVersion < 2) {
      const findings = ((contract.findings as Array<Record<string, unknown>>) || []).map(f => ({
        ...f,
        resolved: f.resolved ?? false,
        note: f.note ?? '',
        recommendation: f.recommendation ?? '',
        clauseReference: f.clauseReference ?? 'N/A',
        negotiationPosition: f.negotiationPosition ?? '',
        actionPriority: f.actionPriority ?? 'monitor',
      }));
      contract.findings = findings;
    }
    return contract as Contract;
  });
}

/**
 * Load contracts from localStorage.
 * On first visit, seeds mock contracts automatically.
 * Standalone function (not hook-dependent) following profileLoader.ts pattern.
 */
export function loadContracts(): {
  contracts: Contract[];
  fromStorage: boolean;
  migrationWarning?: string;
} {
  try {
    // Check schema version — migrate or clear if stale
    const versionResult = loadRaw('clearcontract:schema-version');
    const storedVersion = versionResult.data;
    const version = storedVersion ? parseInt(storedVersion, 10) : 0;

    const contractsResult = load('clearcontract:contracts');

    if (contractsResult.ok && contractsResult.data) {
      const parsed = contractsResult.data;
      if (Array.isArray(parsed)) {
        // Migrate if needed (handles both unversioned v0 and older versioned data)
        if (version < CURRENT_SCHEMA_VERSION) {
          const migrated = migrateContracts(parsed, version);
          saveContracts(migrated);
          saveRaw('clearcontract:schema-version', String(CURRENT_SCHEMA_VERSION));
          return { contracts: migrated, fromStorage: true };
        }
        // Ensure version is set for existing data
        if (!storedVersion) {
          saveRaw('clearcontract:schema-version', String(CURRENT_SCHEMA_VERSION));
        }
        return { contracts: parsed, fromStorage: true };
      }
    }

    // No valid stored data — check if we've seeded before
    const seededResult = loadRaw('clearcontract:contracts-seeded');

    if (!seededResult.data) {
      // First visit: seed with mock contracts
      saveContracts(MOCK_CONTRACTS);
      saveRaw('clearcontract:contracts-seeded', 'true');
      saveRaw('clearcontract:schema-version', String(CURRENT_SCHEMA_VERSION));
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
  const result = save('clearcontract:contracts', contracts);
  if (result.ok) {
    return { success: true };
  }
  if (result.quotaExceeded) {
    return {
      success: false,
      error: 'Storage is full. Your contracts are safe in memory but will not persist after refresh.',
    };
  }
  return { success: false, error: result.error ?? 'Could not save to browser storage.' };
}
