import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { AllContracts } from './AllContracts';

describe('AllContracts', () => {
  it('renders heading and upload button with empty list', () => {
    render(<AllContracts contracts={[]} onNavigate={vi.fn()} />);
    expect(screen.getByText('All Contracts')).toBeInTheDocument();
    expect(screen.getByText('Upload Contract')).toBeInTheDocument();
  });

  it('renders empty filter message when no contracts match', () => {
    render(<AllContracts contracts={[]} onNavigate={vi.fn()} />);
    expect(screen.getByText('No contracts match your filters')).toBeInTheDocument();
  });
});
