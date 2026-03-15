import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from './types';
import { load } from '../storage/storageManager';

/**
 * Load company profile from localStorage, merging with defaults.
 * Standalone function (not hook-dependent) so it can be used from
 * both the useCompanyProfile hook and the analyzeContract API wrapper.
 */
export function loadCompanyProfile(): CompanyProfile {
  const result = load('clearcontract:company-profile');
  if (result.ok && result.data) {
    return { ...DEFAULT_COMPANY_PROFILE, ...result.data };
  }
  return DEFAULT_COMPANY_PROFILE;
}
