import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { StatCard } from './StatCard';
import { FileText } from 'lucide-react';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Contracts" value={42} icon={FileText} />);
    expect(screen.getByText('Total Contracts')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatCard label="Risk" value="High" icon={FileText} color="red" />);
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});
