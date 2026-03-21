import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { RiskScoreDisplay } from './RiskScoreDisplay';

describe('RiskScoreDisplay', () => {
  it('renders risk score', () => {
    render(<RiskScoreDisplay riskScore={75} />);
    expect(screen.getByText('75/100')).toBeInTheDocument();
  });

  it('renders with score breakdown', () => {
    render(
      <RiskScoreDisplay
        riskScore={60}
        scoreBreakdown={[{ name: 'Legal', points: 30 }, { name: 'Financial', points: 30 }]}
      />
    );
    expect(screen.getByText('60/100')).toBeInTheDocument();
  });
});
