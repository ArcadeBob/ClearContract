import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { SeverityBadge } from './SeverityBadge';
import { SEVERITIES } from '../types/contract';
import { SEVERITY_BADGE_COLORS } from '../utils/palette';

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

  it.each(SEVERITIES)('renders %s with correct color classes', (severity) => {
    render(<SeverityBadge severity={severity} />);
    const badge = screen.getByText(severity);
    const expectedClasses = SEVERITY_BADGE_COLORS[severity].split(' ');
    expectedClasses.forEach(cls => expect(badge).toHaveClass(cls));
  });

  it('passes through custom className', () => {
    render(<SeverityBadge severity="High" className="ml-2 custom-class" />);
    const badge = screen.getByText('High');
    expect(badge).toHaveClass('ml-2');
    expect(badge).toHaveClass('custom-class');
  });

  it('includes base badge styling classes', () => {
    render(<SeverityBadge severity="Medium" />);
    const badge = screen.getByText('Medium');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'text-xs', 'font-medium', 'border');
  });
});
