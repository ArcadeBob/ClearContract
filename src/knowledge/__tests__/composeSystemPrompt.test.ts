import { describe, it, expect } from 'vitest';

// Trigger registration side effects
import '../regulatory/index';
import '../standards/index';
import '../trade/index';

import { composeSystemPrompt } from '../index';
import { DEFAULT_COMPANY_PROFILE } from '../types';

describe('composeSystemPrompt', () => {
  it('returns base prompt when pass has no modules', () => {
    const result = composeSystemPrompt('base', 'dates-deadlines');
    expect(result).toBe('base');
  });

  it('appends domain knowledge for pass with modules', () => {
    const result = composeSystemPrompt('base', 'legal-indemnification');
    expect(result).toContain('## Domain Knowledge');
    expect(result).toContain(
      'California Mechanics Lien Law and Void-by-Law Clauses'
    );
  });

  it('appends company profile when provided', () => {
    const result = composeSystemPrompt(
      'base',
      'dates-deadlines',
      DEFAULT_COMPANY_PROFILE
    );
    expect(result).toContain('## Company Profile');
    expect(result).toContain(DEFAULT_COMPANY_PROFILE.contractorLicenseNumber);
  });

  it('appends both modules and profile', () => {
    const result = composeSystemPrompt(
      'base',
      'legal-indemnification',
      DEFAULT_COMPANY_PROFILE
    );
    expect(result).toContain('## Domain Knowledge');
    expect(result).toContain('## Company Profile');
  });
});
