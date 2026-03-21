import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { DEFAULT_COMPANY_PROFILE } from '../knowledge/types';

vi.mock('../hooks/useCompanyProfile', () => ({
  useCompanyProfile: () => ({
    profile: DEFAULT_COMPANY_PROFILE,
    saveField: vi.fn(),
    isLoading: false,
  }),
}));

// Settings uses useFieldValidation which does not need mocking (pure hook)
import { Settings } from './Settings';

describe('Settings', () => {
  it('renders settings heading', () => {
    render(<Settings />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your company profile')).toBeInTheDocument();
  });

  it('renders insurance coverage section', () => {
    render(<Settings />);
    expect(screen.getByText('Insurance Coverage')).toBeInTheDocument();
  });

  it('renders bonding capacity section', () => {
    render(<Settings />);
    expect(screen.getByText('Bonding Capacity')).toBeInTheDocument();
  });
});
