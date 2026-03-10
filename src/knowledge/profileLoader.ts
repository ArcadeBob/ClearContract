import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from './types';

export const STORAGE_KEY = 'clearcontract:company-profile';

/**
 * Load company profile from localStorage, merging with defaults.
 * Standalone function (not hook-dependent) so it can be used from
 * both the useCompanyProfile hook and the analyzeContract API wrapper.
 */
export function loadCompanyProfile(): CompanyProfile {
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
