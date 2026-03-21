import { describe, it, expect, vi, beforeEach } from 'vitest';
import { escapeCsv, sanitizeFilename, exportContractCsv, downloadCsv } from './exportContractCsv';
import { createContract, createFinding, createContractDate } from '../test/factories';

describe('escapeCsv', () => {
  it('returns empty string for undefined', () => {
    expect(escapeCsv(undefined)).toBe('');
  });

  it('returns "Yes" for true', () => {
    expect(escapeCsv(true)).toBe('Yes');
  });

  it('returns "No" for false', () => {
    expect(escapeCsv(false)).toBe('No');
  });

  it('returns plain string unchanged when no special chars', () => {
    expect(escapeCsv('hello')).toBe('hello');
  });

  it('wraps string containing comma in quotes', () => {
    expect(escapeCsv('one,two')).toBe('"one,two"');
  });

  it('wraps string containing double quote and doubles the quote', () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps string containing newline in quotes', () => {
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  it('wraps string containing carriage return', () => {
    expect(escapeCsv('line1\rline2')).toBe('"line1\rline2"');
  });
});

describe('sanitizeFilename', () => {
  it('removes special characters', () => {
    expect(sanitizeFilename('file@#$name!')).toBe('filename');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeFilename('my file name')).toBe('my-file-name');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeFilename('a---b')).toBe('a-b');
  });

  it('trims leading/trailing hyphens', () => {
    expect(sanitizeFilename('--hello--')).toBe('hello');
  });

  it('handles typical contract name', () => {
    expect(sanitizeFilename('ABC Corp. Contract #123')).toBe('ABC-Corp-Contract-123');
  });
});

describe('exportContractCsv', () => {
  it('produces CSV with metadata header and findings columns', () => {
    const finding = createFinding({
      severity: 'Critical',
      category: 'Legal Issues',
      clauseReference: 'Section 5.1',
      recommendation: 'Negotiate removal',
      negotiationPosition: 'Strongly negotiate',
      actionPriority: 'pre-bid',
      resolved: false,
      note: '',
    });
    const contract = createContract({
      name: 'Test Contract',
      type: 'Subcontract',
      riskScore: 75,
      findings: [finding],
      dates: [],
    });

    const csv = exportContractCsv(contract);

    // Check metadata rows
    expect(csv).toContain('Contract Name,Test Contract');
    expect(csv).toContain('Contract Type,Subcontract');
    expect(csv).toContain('Risk Score,75');
    expect(csv).toContain('Total Findings,1');

    // Check column headers
    expect(csv).toContain('Severity,Action Priority,Category,Clause Reference');

    // Check finding data row
    expect(csv).toContain('Critical');
    expect(csv).toContain('pre-bid');
    expect(csv).toContain('Section 5.1');
  });

  it('produces headers even with empty findings', () => {
    const contract = createContract({ findings: [], dates: [] });
    const csv = exportContractCsv(contract);

    expect(csv).toContain('Severity,Action Priority,Category');
    expect(csv).toContain('Total Findings,0');
  });

  it('includes Key Dates section when dates exist', () => {
    const date = createContractDate({ label: 'Start Date', date: '2026-01-15', type: 'Start' });
    const contract = createContract({ findings: [], dates: [date] });
    const csv = exportContractCsv(contract);

    expect(csv).toContain('Key Dates');
    expect(csv).toContain('Start Date');
    expect(csv).toContain('2026-01-15');
  });

  it('omits Key Dates section when no dates', () => {
    const contract = createContract({ findings: [], dates: [] });
    const csv = exportContractCsv(contract);

    expect(csv).not.toContain('Key Dates');
  });

  it('includes bid signal when present', () => {
    const contract = createContract({
      findings: [],
      dates: [],
      bidSignal: { score: 85, level: 'bid', label: 'Bid Recommended', factors: [] },
    });
    const csv = exportContractCsv(contract);

    expect(csv).toContain('Bid Signal');
    expect(csv).toContain('Bid Recommended (85)');
  });

  it('respects options.findings filter', () => {
    const f1 = createFinding({ severity: 'Critical', category: 'Legal Issues' });
    const f2 = createFinding({ severity: 'Low', category: 'Scope of Work' });
    const contract = createContract({ findings: [f1, f2], dates: [] });

    const csv = exportContractCsv(contract, {
      findings: [f1],
      filterDescriptions: ['Critical only'],
    });

    expect(csv).toContain('Exported Findings,1');
    expect(csv).toContain('Filters Applied,Critical only');
    expect(csv).toContain('Total Findings,2');
  });

  it('sorts findings by severity order', () => {
    const low = createFinding({ severity: 'Low', title: 'Low Finding' });
    const critical = createFinding({ severity: 'Critical', title: 'Critical Finding' });
    const contract = createContract({ findings: [low, critical], dates: [] });

    const csv = exportContractCsv(contract);
    const criticalIdx = csv.indexOf('Critical');
    const lowIdx = csv.lastIndexOf('Low');

    // Critical should appear before Low in finding data rows
    expect(criticalIdx).toBeLessThan(lowIdx);
  });
});

describe('downloadCsv', () => {
  it('creates blob, triggers download, and cleans up', () => {
    const mockClick = vi.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor);
    vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchor);
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    downloadCsv('col1,col2\nval1,val2', 'test.csv');

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockAnchor.download).toBe('test.csv');
    expect(mockClick).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    vi.restoreAllMocks();
  });
});
