import { useState, useCallback } from 'react';
import { CompanyProfile } from '../knowledge/types';
import { loadCompanyProfile } from '../knowledge/profileLoader';
import { save } from '../storage/storageManager';

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(loadCompanyProfile);
  const [storageError, setStorageError] = useState<string | null>(null);

  const saveField = useCallback(
    <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]): boolean => {
      let success = true;
      setProfile((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        const result = save('clearcontract:company-profile', next);
        if (result.ok) {
          setStorageError(null);
        } else {
          success = false;
          setStorageError(
            result.quotaExceeded
              ? 'Settings saved in memory but may not persist after refresh (storage full).'
              : result.error ?? 'Could not save settings to browser storage.'
          );
        }
        return next;
      });
      return success;
    },
    []
  );

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  return { profile, saveField, storageError, dismissStorageError };
}
