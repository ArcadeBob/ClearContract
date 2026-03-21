import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { ReviewHeader } from './ReviewHeader';
import { createContract, createFinding } from '../test/factories';
import { SEVERITIES, CATEGORIES } from '../types/contract';

describe('ReviewHeader', () => {
  it('renders contract name and client', () => {
    const contract = createContract({
      name: 'Test Agreement',
      client: 'ABC Corp',
      type: 'Subcontract',
      findings: [createFinding()],
    });
    render(
      <ReviewHeader
        contract={contract}
        onBack={vi.fn()}
        visibleFindings={contract.findings}
        filters={{
          severities: new Set(SEVERITIES),
          categories: new Set(CATEGORIES),
          priorities: new Set(['pre-bid', 'pre-sign', 'monitor'] as const),
          negotiationOnly: false,
        }}
        hideResolved={false}
      />
    );
    expect(screen.getByText('Test Agreement')).toBeInTheDocument();
    expect(screen.getByText(/ABC Corp/)).toBeInTheDocument();
  });
});
