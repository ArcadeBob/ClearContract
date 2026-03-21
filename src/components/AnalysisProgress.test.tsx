import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { AnalysisProgress } from './AnalysisProgress';

describe('AnalysisProgress', () => {
  it('renders heading and first step', () => {
    render(<AnalysisProgress />);
    expect(screen.getByText('Analyzing Contract')).toBeInTheDocument();
    expect(screen.getByText('Scanning Legal Terms...')).toBeInTheDocument();
  });

  it('renders in loading mode', () => {
    render(<AnalysisProgress isLoading={true} />);
    expect(screen.getByText('Analyzing Contract')).toBeInTheDocument();
  });
});
