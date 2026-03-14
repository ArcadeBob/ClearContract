import { useState, useCallback } from 'react';
import { CompanyProfile } from '../knowledge/types';
import { loadCompanyProfile, STORAGE_KEY } from '../knowledge/profileLoader';

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(loadCompanyProfile);
  const [storageError, setStorageError] = useState<string | null>(null);

  const saveField = useCallback(
    <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]): boolean => {
      let success = true;
      setProfile((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          setStorageError(null);
        } catch {
          success = false;
          setStorageError('Settings saved in memory but may not persist after refresh (storage full).');
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
