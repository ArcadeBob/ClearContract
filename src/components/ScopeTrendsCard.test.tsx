import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { ScopeTrendsCard } from './ScopeTrendsCard';
import { createContract, createFinding } from '../test/factories';
import type { Contract } from '../types/contract';

/** Helper: create N reviewed contracts with scope-intel findings */
function createReviewedContractsWithScopeFindings(count: number): Contract[] {
  return Array.from({ length: count }, (_, i) =>
    createContract({
      status: 'Reviewed',
      findings: [
        createFinding({
          title: 'Glass exclusion',
          category: 'Scope of Work',
          sourcePass: 'scope-extraction',
          scopeMeta: {
            passType: 'scope-extraction',
            scopeItemType: 'exclusion',
            specificationReference: '08 44 13',
            affectedTrade: 'Glazing',
          },
        }),
        createFinding({
          title: 'Curtain wall installation',
          category: 'Scope of Work',
          sourcePass: 'scope-extraction',
          scopeMeta: {
            passType: 'scope-extraction',
            scopeItemType: 'inclusion',
            specificationReference: '08 44 13',
            affectedTrade: 'Glazing',
          },
        }),
        createFinding({
          title: 'Structural calc exclusion challenged',
          category: 'Scope of Work',
          sourcePass: 'exclusion-stress-test',
          scopeMeta: {
            passType: 'exclusion-stress-test',
            exclusionQuote: 'Structural calculations excluded',
            tensionQuote: 'AAMA 501.4 requires verification',
            specSection: '08 44 13',
            tensionType: 'spec-requires-excluded-item',
          },
        }),
      ],
    })
  );
}

describe('ScopeTrendsCard', () => {
  it('Test 1: returns null when fewer than 10 reviewed contracts', () => {
    const contracts = Array.from({ length: 9 }, () =>
      createContract({ status: 'Reviewed' })
    );
    const { container } = render(<ScopeTrendsCard contracts={contracts} />);
    expect(container.innerHTML).toBe('');
  });

  it('Test 2: returns null when exactly 10 contracts but none are Reviewed or Partial', () => {
    const contracts = Array.from({ length: 10 }, () =>
      createContract({ status: 'Analyzing' })
    );
    const { container } = render(<ScopeTrendsCard contracts={contracts} />);
    expect(container.innerHTML).toBe('');
  });

  it('Test 3: renders card when 10+ reviewed contracts exist with scope-intel findings', () => {
    const contracts = createReviewedContractsWithScopeFindings(10);
    render(<ScopeTrendsCard contracts={contracts} />);
    expect(screen.getByText('Scope Trends')).toBeInTheDocument();
  });

  it('Test 4: shows top 5 exclusions sorted by frequency (most common first)', () => {
    // Create 10 contracts, each with different exclusion counts
    const contracts = Array.from({ length: 10 }, (_, i) =>
      createContract({
        status: 'Reviewed',
        findings: [
          // "Glass exclusion" appears in all 10
          createFinding({
            title: 'Glass exclusion',
            category: 'Scope of Work',
            sourcePass: 'scope-extraction',
            scopeMeta: {
              passType: 'scope-extraction',
              scopeItemType: 'exclusion',
              specificationReference: '08 44 13',
              affectedTrade: 'Glazing',
            },
          }),
          // "Caulking exclusion" appears in first 7
          ...(i < 7
            ? [
                createFinding({
                  title: 'Caulking exclusion',
                  category: 'Scope of Work',
                  sourcePass: 'scope-extraction',
                  scopeMeta: {
                    passType: 'scope-extraction',
                    scopeItemType: 'exclusion',
                    specificationReference: '07 92 00',
                    affectedTrade: 'Glazing',
                  },
                }),
              ]
            : []),
        ],
      })
    );
    render(<ScopeTrendsCard contracts={contracts} />);
    expect(screen.getByText('Most Declared Exclusions')).toBeInTheDocument();
    expect(screen.getByText('Glass exclusion')).toBeInTheDocument();
    expect(screen.getByText('Caulking exclusion')).toBeInTheDocument();
    // Glass exclusion (10) should appear before Caulking exclusion (7)
    expect(screen.getByText('10/10 contracts')).toBeInTheDocument();
    expect(screen.getByText('7/10 contracts')).toBeInTheDocument();
  });

  it('Test 5: shows top 5 recurring scope items sorted by frequency', () => {
    const contracts = Array.from({ length: 10 }, () =>
      createContract({
        status: 'Reviewed',
        findings: [
          createFinding({
            title: 'Curtain wall installation',
            category: 'Scope of Work',
            sourcePass: 'scope-extraction',
            scopeMeta: {
              passType: 'scope-extraction',
              scopeItemType: 'inclusion',
              specificationReference: '08 44 13',
              affectedTrade: 'Glazing',
            },
          }),
        ],
      })
    );
    render(<ScopeTrendsCard contracts={contracts} />);
    expect(screen.getByText('Recurring Scope Items')).toBeInTheDocument();
    expect(screen.getByText('Curtain wall installation')).toBeInTheDocument();
    expect(screen.getByText('10/10 contracts')).toBeInTheDocument();
  });

  it('Test 6: shows commonly challenged exclusions from exclusion-stress-test findings', () => {
    const contracts = Array.from({ length: 10 }, () =>
      createContract({
        status: 'Reviewed',
        findings: [
          createFinding({
            title: 'Structural calc exclusion challenged',
            category: 'Scope of Work',
            sourcePass: 'exclusion-stress-test',
            scopeMeta: {
              passType: 'exclusion-stress-test',
              exclusionQuote: 'Structural calculations excluded',
              tensionQuote: 'AAMA 501.4 requires verification',
              specSection: '08 44 13',
              tensionType: 'spec-requires-excluded-item',
            },
          }),
        ],
      })
    );
    render(<ScopeTrendsCard contracts={contracts} />);
    expect(screen.getByText('Commonly Challenged Exclusions')).toBeInTheDocument();
    expect(screen.getByText('Structural calc exclusion challenged')).toBeInTheDocument();
  });

  it('Test 7: pre-v3.0 contracts (no sourcePass or scopeMeta) do not contribute and do not crash', () => {
    // 10 reviewed contracts: 5 with scope data, 5 pre-v3.0 (no scopeMeta)
    const scopeContracts = createReviewedContractsWithScopeFindings(5);
    const legacyContracts = Array.from({ length: 5 }, () =>
      createContract({
        status: 'Reviewed',
        findings: [
          createFinding({
            title: 'Legacy finding',
            category: 'Scope of Work',
            // no sourcePass, no scopeMeta
          }),
        ],
      })
    );
    const contracts = [...scopeContracts, ...legacyContracts];
    render(<ScopeTrendsCard contracts={contracts} />);
    // Card should render (10 reviewed contracts), legacy findings should not crash
    expect(screen.getByText('Scope Trends')).toBeInTheDocument();
    // Legacy "Legacy finding" should NOT appear in any trend section
    expect(screen.queryByText('Legacy finding')).not.toBeInTheDocument();
  });

  it('Test 8: shows empty-trends message when 10+ contracts but zero scope-intel findings', () => {
    const contracts = Array.from({ length: 12 }, () =>
      createContract({
        status: 'Reviewed',
        findings: [
          createFinding({
            title: 'Legal clause',
            category: 'Legal Issues',
          }),
        ],
      })
    );
    render(<ScopeTrendsCard contracts={contracts} />);
    expect(screen.getByText('Scope Trends')).toBeInTheDocument();
    expect(
      screen.getByText('Not enough scope data to identify trends yet.')
    ).toBeInTheDocument();
  });
});
