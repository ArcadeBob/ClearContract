import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadContracts, saveContracts } from './contractStorage';
import { createContract } from '../test/factories';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('loadContracts', () => {
  it('seeds mock contracts on first visit (no seeded flag)', () => {
    const result = loadContracts();
    expect(result.fromStorage).toBe(false);
    expect(result.contracts.length).toBeGreaterThan(0);
    // Verify seeded flag and schema version were set
    expect(localStorage.getItem('clearcontract:contracts-seeded')).toBe('true');
    expect(localStorage.getItem('clearcontract:schema-version')).toBe('2');
  });

  it('returns empty array when seeded flag exists but no contracts', () => {
    localStorage.setItem('clearcontract:contracts-seeded', 'true');
    const result = loadContracts();
    expect(result.contracts).toEqual([]);
    expect(result.fromStorage).toBe(true);
  });

  it('returns stored v2 contracts as-is', () => {
    const contract = createContract({ id: 'stored-1', name: 'Stored Contract' });
    localStorage.setItem('clearcontract:contracts', JSON.stringify([contract]));
    localStorage.setItem('clearcontract:schema-version', '2');
    localStorage.setItem('clearcontract:contracts-seeded', 'true');

    const result = loadContracts();
    expect(result.fromStorage).toBe(true);
    expect(result.contracts).toHaveLength(1);
    expect(result.contracts[0].id).toBe('stored-1');
    expect(result.contracts[0].name).toBe('Stored Contract');
  });

  it('migrates v1 contracts (no schema version) by backfilling finding fields', () => {
    const v1Contract = {
      id: 'v1-test',
      name: 'V1 Contract',
      client: 'Client',
      type: 'Subcontract',
      uploadDate: '2026-01-01',
      status: 'Reviewed',
      findings: [
        {
          id: 'f1',
          severity: 'High',
          category: 'Legal Issues',
          title: 'Test Finding',
          description: 'Description',
        },
      ],
      dates: [],
      riskScore: 50,
    };
    localStorage.setItem('clearcontract:contracts', JSON.stringify([v1Contract]));
    // No schema-version set (v0/v1)

    const result = loadContracts();
    expect(result.fromStorage).toBe(true);
    expect(result.contracts).toHaveLength(1);

    const finding = result.contracts[0].findings[0];
    expect(finding.resolved).toBe(false);
    expect(finding.note).toBe('');
    expect(finding.recommendation).toBe('');
    expect(finding.clauseReference).toBe('N/A');
    expect(finding.negotiationPosition).toBe('');
    expect(finding.actionPriority).toBe('monitor');

    // Schema version updated
    expect(localStorage.getItem('clearcontract:schema-version')).toBe('2');
  });

  it('preserves existing finding values during v1 migration', () => {
    const v1Contract = {
      id: 'v1-preserve',
      name: 'V1 Preserve',
      client: 'Client',
      type: 'Subcontract',
      uploadDate: '2026-01-01',
      status: 'Reviewed',
      findings: [
        {
          id: 'f2',
          severity: 'High',
          category: 'Legal Issues',
          title: 'Existing Finding',
          description: 'Description',
          resolved: true,
          note: 'existing note',
          recommendation: 'existing rec',
          clauseReference: 'Section 5',
          negotiationPosition: 'existing pos',
          actionPriority: 'pre-sign',
        },
      ],
      dates: [],
      riskScore: 60,
    };
    localStorage.setItem('clearcontract:contracts', JSON.stringify([v1Contract]));
    // version=1 triggers migration
    localStorage.setItem('clearcontract:schema-version', '1');

    const result = loadContracts();
    const finding = result.contracts[0].findings[0];
    // Existing values preserved (nullish coalescing ??)
    expect(finding.resolved).toBe(true);
    expect(finding.note).toBe('existing note');
    expect(finding.recommendation).toBe('existing rec');
    expect(finding.clauseReference).toBe('Section 5');
    expect(finding.negotiationPosition).toBe('existing pos');
    expect(finding.actionPriority).toBe('pre-sign');
  });
});

describe('saveContracts', () => {
  it('returns success:true and persists contracts', () => {
    const contract = createContract();
    const result = saveContracts([contract]);
    expect(result.success).toBe(true);
    const stored = JSON.parse(localStorage.getItem('clearcontract:contracts')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(contract.id);
  });

  it('returns success:false with storage full message on QuotaExceededError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const result = saveContracts([]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Storage is full');
  });
});
