import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { ScopeIntelView } from './ScopeIntelView';
import { createContract, createFinding } from '../test/factories';
import type { SubmittalEntry } from '../types/contract';

function makeSubmittal(overrides?: Partial<SubmittalEntry>): SubmittalEntry {
  return {
    type: 'shop-drawing',
    description: 'Test submittal',
    reviewDuration: 14,
    responsibleParty: 'GC',
    reviewCycles: 2,
    resubmittalBuffer: 7,
    specSection: 'Div 08',
    leadTime: 21,
    clauseReference: 'Section 3.1',
    statedFields: ['reviewDuration', 'resubmittalBuffer'],
    ...overrides,
  };
}

describe('ScopeIntelView', () => {
  it('renders all three sub-components when contract has full data', () => {
    const contract = createContract({
      submittals: [makeSubmittal()],
      bidFileName: 'bid.pdf',
      findings: [
        createFinding({
          sourcePass: 'spec-reconciliation',
          category: 'Scope of Work',
          title: 'Spec Gap Finding',
          scopeMeta: {
            passType: 'spec-reconciliation',
            specSection: 'AAMA 501',
            typicalDeliverable: 'Shop drawings',
            gapType: 'missing',
          },
        }),
        createFinding({
          sourcePass: 'bid-reconciliation',
          category: 'Scope of Work',
          title: 'Bid Recon Finding',
          scopeMeta: {
            passType: 'bid-reconciliation',
            contractQuote: 'Contract says X',
            bidQuote: 'Bid says Y',
            reconciliationType: 'exclusion-parity',
            directionOfRisk: 'Risk to subcontractor',
          },
        }),
      ],
    });

    render(<ScopeIntelView contract={contract} />);
    expect(screen.getByText('Submittal Timeline')).toBeInTheDocument();
    expect(screen.getByText('Spec Gap Matrix')).toBeInTheDocument();
    expect(screen.getByText('Bid / Contract Diff')).toBeInTheDocument();
  });

  it('SubmittalTimeline shows empty state when submittals is empty', () => {
    const contract = createContract({ submittals: [], findings: [] });
    render(<ScopeIntelView contract={contract} />);
    expect(screen.getByText('No Submittals Extracted')).toBeInTheDocument();
  });

  it('SpecGapMatrix shows empty state when no spec-reconciliation findings', () => {
    const contract = createContract({ findings: [] });
    render(<ScopeIntelView contract={contract} />);
    expect(screen.getByText('No Spec Gaps Detected')).toBeInTheDocument();
  });

  it('BidContractDiff shows "No Bid Document Attached" when bidFileName is null', () => {
    const contract = createContract({ bidFileName: null, findings: [] });
    render(<ScopeIntelView contract={contract} />);
    expect(screen.getByText('No Bid Document Attached')).toBeInTheDocument();
  });

  it('BidContractDiff shows no-findings message when hasBid but zero findings', () => {
    const contract = createContract({ bidFileName: 'bid.pdf', findings: [] });
    render(<ScopeIntelView contract={contract} />);
    expect(
      screen.getByText('No bid reconciliation gaps found. Bid and contract scope appear aligned.')
    ).toBeInTheDocument();
  });
});
