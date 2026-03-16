import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { SeverityBadge } from './SeverityBadge';

describe('SeverityBadge', () => {
  it('renders severity text', () => {
    render(<SeverityBadge severity="Critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders with downgrade indicator', () => {
    render(<SeverityBadge severity="Medium" downgradedFrom="High" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('was High')).toBeInTheDocument();
  });
});
