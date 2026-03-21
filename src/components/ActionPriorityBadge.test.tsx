import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { ActionPriorityBadge } from './ActionPriorityBadge';

describe('ActionPriorityBadge', () => {
  it('renders pre-bid label', () => {
    render(<ActionPriorityBadge priority="pre-bid" />);
    expect(screen.getByText('Pre-Bid')).toBeInTheDocument();
  });

  it('renders pre-sign label', () => {
    render(<ActionPriorityBadge priority="pre-sign" />);
    expect(screen.getByText('Pre-Sign')).toBeInTheDocument();
  });

  it('renders monitor label', () => {
    render(<ActionPriorityBadge priority="monitor" />);
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });
});
