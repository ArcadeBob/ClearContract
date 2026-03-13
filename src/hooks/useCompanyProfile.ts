import { useState, useCallback } from 'react';
import { CompanyProfile } from '../knowledge/types';
import { loadCompanyProfile, STORAGE_KEY } from '../knowledge/profileLoader';

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(loadCompanyProfile);

  const updateField = useCallback(
    <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
      setProfile((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Quota exceeded or unavailable -- fail silently
        }
        return next;
      });
    },
    []
  );

  const saveField = useCallback(
    <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
      setProfile((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Quota exceeded or unavailable -- fail silently
        }
        return next;
      });
    },
    []
  );

  return { profile, updateField, saveField };
}
