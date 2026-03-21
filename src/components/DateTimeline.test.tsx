import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { DateTimeline } from './DateTimeline';
import { createContractDate } from '../test/factories';

describe('DateTimeline', () => {
  it('renders empty state when no dates', () => {
    render(<DateTimeline dates={[]} />);
    expect(screen.getByText('No dates found in this contract')).toBeInTheDocument();
  });

  it('renders dates with labels', () => {
    const dates = [
      createContractDate({ label: 'Project Start', date: '2026-01-15', type: 'Start' }),
      createContractDate({ label: 'Substantial Completion', date: '2026-06-30', type: 'Deadline' }),
    ];
    render(<DateTimeline dates={dates} />);
    expect(screen.getByText('Project Start')).toBeInTheDocument();
    expect(screen.getByText('Substantial Completion')).toBeInTheDocument();
    expect(screen.getByText('Key Dates & Milestones')).toBeInTheDocument();
  });
});
