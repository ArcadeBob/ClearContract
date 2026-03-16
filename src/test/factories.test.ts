import { describe, it, expect } from 'vitest';
import { createFinding, createContract, createContractDate } from './factories';
import { MergedFindingSchema } from '../schemas/finding';

describe('createFinding', () => {
  it('produces a valid MergedFinding with defaults', () => {
    const finding = createFinding();
    // Should not throw -- factory already parses, but double-check
    const parsed = MergedFindingSchema.parse(finding);
    expect(parsed.severity).toBe('Medium');
    expect(parsed.category).toBe('Scope of Work');
    expect(parsed.resolved).toBe(false);
  });

  it('accepts overrides', () => {
    const finding = createFinding({ severity: 'Critical', resolved: true });
    expect(finding.severity).toBe('Critical');
    expect(finding.resolved).toBe(true);
  });

  it('generates unique IDs across calls', () => {
    const f1 = createFinding();
    const f2 = createFinding();
    expect(f1.id).not.toBe(f2.id);
  });
});

describe('createContract', () => {
  it('produces a contract with default fields', () => {
    const contract = createContract();
    expect(contract.type).toBe('Subcontract');
    expect(contract.status).toBe('Reviewed');
    expect(contract.findings).toEqual([]);
    expect(contract.riskScore).toBe(45);
  });

  it('accepts overrides', () => {
    const contract = createContract({ riskScore: 80, client: 'Custom Client' });
    expect(contract.riskScore).toBe(80);
    expect(contract.client).toBe('Custom Client');
  });
});

describe('createContractDate', () => {
  it('produces a date with defaults', () => {
    const date = createContractDate();
    expect(date.label).toBe('Substantial Completion');
    expect(date.type).toBe('Deadline');
  });
});
