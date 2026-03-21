import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContract, createFinding, createContractDate } from '../test/factories';

// Use vi.hoisted so these are available when vi.mock factories execute (hoisted to top)
const {
  mockSave,
  mockText,
  mockSetFontSize,
  mockSetTextColor,
  mockSetDrawColor,
  mockSetLineWidth,
  mockLine,
  mockAddPage,
  mockSetPage,
  mockGetNumberOfPages,
  mockJsPdfInstance,
  mockAutoTable,
} = vi.hoisted(() => {
  const mockSave = vi.fn();
  const mockText = vi.fn();
  const mockSetFontSize = vi.fn();
  const mockSetTextColor = vi.fn();
  const mockSetDrawColor = vi.fn();
  const mockSetLineWidth = vi.fn();
  const mockLine = vi.fn();
  const mockAddPage = vi.fn();
  const mockSetPage = vi.fn();
  const mockGetNumberOfPages = vi.fn(() => 1);

  const mockJsPdfInstance = {
    text: mockText,
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    setDrawColor: mockSetDrawColor,
    setLineWidth: mockSetLineWidth,
    line: mockLine,
    addPage: mockAddPage,
    setPage: mockSetPage,
    getNumberOfPages: mockGetNumberOfPages,
    save: mockSave,
    internal: {
      pageSize: {
        getWidth: () => 215.9,
        getHeight: () => 279.4,
      },
    },
    lastAutoTable: { finalY: 100 },
  };

  const mockAutoTable = vi.fn();

  return {
    mockSave,
    mockText,
    mockSetFontSize,
    mockSetTextColor,
    mockSetDrawColor,
    mockSetLineWidth,
    mockLine,
    mockAddPage,
    mockSetPage,
    mockGetNumberOfPages,
    mockJsPdfInstance,
    mockAutoTable,
  };
});

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => mockJsPdfInstance),
}));

vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable,
}));

import { exportContractPdf } from './exportContractPdf';

describe('exportContractPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNumberOfPages.mockReturnValue(1);
  });

  it('generates PDF and calls save with sanitized filename', () => {
    const contract = createContract({
      name: 'My Contract #1',
      client: 'Acme Corp',
      type: 'Subcontract',
      riskScore: 55,
      findings: [
        createFinding({ severity: 'High', category: 'Legal Issues', title: 'Risk clause' }),
      ],
      dates: [],
    });

    exportContractPdf(contract);

    expect(mockSave).toHaveBeenCalledOnce();
    const savedFilename = mockSave.mock.calls[0][0] as string;
    expect(savedFilename).toContain('My-Contract-1');
    expect(savedFilename).toMatch(/-report\.pdf$/);
  });

  it('calls autoTable for findings by category', () => {
    const contract = createContract({
      name: 'Test PDF',
      findings: [
        createFinding({ severity: 'Critical', category: 'Legal Issues' }),
        createFinding({ severity: 'Medium', category: 'Scope of Work' }),
      ],
      dates: [],
    });

    exportContractPdf(contract);

    // autoTable called for each category with findings + possibly negotiation table
    expect(mockAutoTable).toHaveBeenCalled();
    expect(mockAutoTable.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('produces PDF with no findings (save still called)', () => {
    const contract = createContract({ name: 'Empty', findings: [], dates: [] });

    exportContractPdf(contract);

    expect(mockSave).toHaveBeenCalledOnce();
  });

  it('includes dates table when dates exist', () => {
    const contract = createContract({
      name: 'Dated Contract',
      findings: [],
      dates: [createContractDate({ label: 'Completion', date: '2026-12-01', type: 'Deadline' })],
    });

    exportContractPdf(contract);

    // autoTable called for the dates section
    expect(mockAutoTable).toHaveBeenCalled();
    const lastCall = mockAutoTable.mock.calls[mockAutoTable.mock.calls.length - 1];
    const config = lastCall[1];
    expect(config.head[0]).toContain('Date');
  });

  it('includes negotiation section for Critical/High findings with positions', () => {
    const contract = createContract({
      name: 'Negotiation PDF',
      findings: [
        createFinding({
          severity: 'Critical',
          category: 'Legal Issues',
          negotiationPosition: 'Demand removal of clause',
        }),
      ],
      dates: [],
    });

    exportContractPdf(contract);

    // Should have category table + negotiation table
    const negotiationCall = mockAutoTable.mock.calls.find((call) => {
      const config = call[1];
      return config.head?.[0]?.includes('Negotiation Position');
    });
    expect(negotiationCall).toBeDefined();
  });

  it('renders footer on each page', () => {
    mockGetNumberOfPages.mockReturnValue(2);
    const contract = createContract({ name: 'Multi', findings: [], dates: [] });

    exportContractPdf(contract);

    // setPage called for each page in footer loop
    expect(mockSetPage).toHaveBeenCalledWith(1);
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });

  it('displays bid signal when present', () => {
    const contract = createContract({
      name: 'Bid Signal PDF',
      findings: [],
      dates: [],
      bidSignal: { score: 72, level: 'bid', label: 'Bid Recommended', factors: [] },
    });

    exportContractPdf(contract);

    const bidTextCall = mockText.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Bid Signal')
    );
    expect(bidTextCall).toBeDefined();
  });
});
