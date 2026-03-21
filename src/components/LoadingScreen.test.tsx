import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { LoadingScreen } from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders app name', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('ClearContract')).toBeInTheDocument();
  });
});
