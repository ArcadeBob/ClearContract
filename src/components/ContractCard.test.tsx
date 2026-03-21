import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { ContractCard } from './ContractCard';
import { createContract, createFinding } from '../test/factories';

describe('ContractCard', () => {
  it('renders contract name, client, type, and risk score', () => {
    const contract = createContract({
      name: 'Glass Install Agreement',
      client: 'Acme Corp',
      type: 'Subcontract',
      riskScore: 72,
      findings: [createFinding({ severity: 'Critical' })],
    });
    render(<ContractCard contract={contract} onClick={vi.fn()} />);
    expect(screen.getByText('Glass Install Agreement')).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText(/Risk: 72\/100/)).toBeInTheDocument();
  });
});
