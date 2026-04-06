import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('renders empty state when no contracts', () => {
    render(<Dashboard contracts={[]} onNavigate={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('No Contracts Yet')).toBeInTheDocument();
    expect(screen.getByText('Upload Your First Contract')).toBeInTheDocument();
  });

  it('renders stat cards when contracts exist', () => {
    const contracts = [
      {
        id: '1',
        name: 'Test Contract',
        client: 'Client A',
        type: 'Subcontract' as const,
        uploadDate: new Date().toISOString(),
        status: 'Reviewed' as const,
        lifecycleStatus: 'Draft' as const,
        findings: [],
        dates: [],
        submittals: [],
        riskScore: 50,
      },
    ];
    render(<Dashboard contracts={contracts} onNavigate={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Contracts Reviewed')).toBeInTheDocument();
    expect(screen.getByText('Recent Contracts')).toBeInTheDocument();
  });
});
