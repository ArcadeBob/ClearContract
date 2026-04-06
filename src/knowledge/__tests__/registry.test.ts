import { describe, it, expect } from 'vitest';

// Trigger registration side effects
import '../regulatory/index';
import '../standards/index';
import '../trade/index';

import {
  getModulesForPass,
  getAllModules,
  validateAllModulesRegistered,
  PASS_KNOWLEDGE_MAP,
} from '../registry';

describe('registry', () => {
  it('all mapped modules are registered', () => {
    expect(() => validateAllModulesRegistered()).not.toThrow();
  });

  it('getAllModules returns all 14 modules', () => {
    expect(getAllModules()).toHaveLength(14);
  });

  it('getModulesForPass returns mapped modules for legal-indemnification', () => {
    const result = getModulesForPass('legal-indemnification');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ca-lien-law');
  });

  it('getModulesForPass returns mapped modules for scope-extraction', () => {
    const result = getModulesForPass('scope-extraction');
    expect(result).toHaveLength(6);
    const ids = result.map((m) => m.id);
    expect(ids).toContain('ca-title24');
    expect(ids).toContain('div08-scope');
    expect(ids).toContain('standards-validation');
    expect(ids).toContain('contract-forms');
    expect(ids).toContain('div08-deliverables');
    expect(ids).toContain('aama-submittal-standards');
  });

  it('getModulesForPass returns empty for unmapped pass (dates-deadlines)', () => {
    expect(getModulesForPass('dates-deadlines')).toEqual([]);
  });

  it('PASS_KNOWLEDGE_MAP has entries for all 17 passes', () => {
    expect(Object.keys(PASS_KNOWLEDGE_MAP)).toHaveLength(17);
  });
});
