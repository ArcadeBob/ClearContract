import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { RiskSummary } from './RiskSummary';
import { createFinding } from '../test/factories';

describe('RiskSummary', () => {
  it('renders heading and severity counts', () => {
    const findings = [
      createFinding({ severity: 'Critical' }),
      createFinding({ severity: 'High' }),
      createFinding({ severity: 'High' }),
    ];
    render(<RiskSummary findings={findings} resolvedCount={0} totalFindings={3} />);
    expect(screen.getByText('Risk Summary')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders resolved count when present', () => {
    const findings = [createFinding({ severity: 'Medium' })];
    render(<RiskSummary findings={findings} resolvedCount={1} totalFindings={2} />);
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });
});
