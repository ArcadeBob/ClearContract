import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { NegotiationChecklist } from './NegotiationChecklist';
import { createFinding } from '../test/factories';

describe('NegotiationChecklist', () => {
  it('renders empty state when no negotiable findings', () => {
    const findings = [createFinding({ negotiationPosition: '' })];
    render(<NegotiationChecklist findings={findings} />);
    expect(screen.getByText('No negotiation positions available')).toBeInTheDocument();
  });

  it('renders section headers when findings have negotiation positions', () => {
    const findings = [
      createFinding({
        title: 'Indemnification Issue',
        negotiationPosition: 'Request amendment',
        actionPriority: 'pre-bid',
      }),
    ];
    render(<NegotiationChecklist findings={findings} />);
    expect(screen.getByText('PRE-BID')).toBeInTheDocument();
    expect(screen.getByText('Indemnification Issue')).toBeInTheDocument();
  });
});
