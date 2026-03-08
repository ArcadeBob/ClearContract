import { useState, useCallback } from 'react';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from '../knowledge/types';

const STORAGE_KEY = 'clearcontract:company-profile';

function loadProfile(): CompanyProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(stored) };
    }
  } catch {
    // Safari private mode, corrupt data, etc. -- fall back silently
  }
  return DEFAULT_COMPANY_PROFILE;
}

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(loadProfile);

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

  return { profile, updateField };
}
