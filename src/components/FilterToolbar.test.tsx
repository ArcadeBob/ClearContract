import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../test/render';
import { FilterToolbar, type ViewMode } from './FilterToolbar';
import { SEVERITIES, CATEGORIES } from '../types/contract';
import type { FilterState } from '../hooks/useContractFiltering';

vi.mock('./MultiSelectDropdown', () => ({
  MultiSelectDropdown: ({ label }: { label: string }) => (
    <div data-testid={`dropdown-${label}`}>{label}</div>
  ),
}));

function defaultProps(
  overrides?: Partial<{
    viewMode: ViewMode;
    setViewMode: ReturnType<typeof vi.fn>;
    filters: FilterState;
    toggleFilter: ReturnType<typeof vi.fn>;
    setFilterSet: ReturnType<typeof vi.fn>;
    hideResolved: boolean;
    toggleHideResolved: ReturnType<typeof vi.fn>;
  }>
) {
  return {
    viewMode: 'by-category' as ViewMode,
    setViewMode: vi.fn(),
    filters: {
      severities: new Set(SEVERITIES),
      categories: new Set(CATEGORIES),
      priorities: new Set(['pre-bid', 'pre-sign', 'monitor']),
      negotiationOnly: false,
    } as FilterState,
    toggleFilter: vi.fn(),
    setFilterSet: vi.fn(),
    hideResolved: false,
    toggleHideResolved: vi.fn(),
    ...overrides,
  };
}

const viewModeButtons: [string, ViewMode][] = [
  ['By Category', 'by-category'],
  ['All by Severity', 'by-severity'],
  ['Coverage', 'coverage'],
  ['Negotiation', 'negotiation'],
];

describe('FilterToolbar', () => {
  it('renders all 4 view mode buttons', () => {
    render(<FilterToolbar {...defaultProps()} />);
    expect(screen.getByText('By Category')).toBeInTheDocument();
    expect(screen.getByText('All by Severity')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Negotiation')).toBeInTheDocument();
  });

  it.each(viewModeButtons)(
    'clicking "%s" calls setViewMode with "%s"',
    async (label, mode) => {
      const setViewMode = vi.fn();
      render(<FilterToolbar {...defaultProps({ setViewMode })} />);
      const user = userEvent.setup();
      await user.click(screen.getByText(label));
      expect(setViewMode).toHaveBeenCalledWith(mode);
    }
  );

  it.each(viewModeButtons)(
    'highlights "%s" when viewMode is "%s"',
    (label, mode) => {
      render(<FilterToolbar {...defaultProps({ viewMode: mode })} />);
      const button = screen.getByText(label).closest('button')!;
      expect(button).toHaveClass('bg-white');
    }
  );

  it('inactive button does not have bg-white', () => {
    render(
      <FilterToolbar {...defaultProps({ viewMode: 'by-severity' })} />
    );
    const inactive = screen.getByText('By Category').closest('button')!;
    expect(inactive).not.toHaveClass('bg-white');
    expect(inactive).toHaveClass('text-slate-500');
  });

  it('hide-resolved checkbox unchecked by default and toggles', async () => {
    const toggleHideResolved = vi.fn();
    render(
      <FilterToolbar
        {...defaultProps({ hideResolved: false, toggleHideResolved })}
      />
    );
    const checkbox = screen.getByLabelText('Hide resolved');
    expect(checkbox).not.toBeChecked();
    const user = userEvent.setup();
    await user.click(checkbox);
    expect(toggleHideResolved).toHaveBeenCalled();
  });

  it('hide-resolved checkbox is checked when hideResolved is true', () => {
    render(
      <FilterToolbar {...defaultProps({ hideResolved: true })} />
    );
    expect(screen.getByLabelText('Hide resolved')).toBeChecked();
  });

  it('negotiation-only checkbox toggles filter', async () => {
    const toggleFilter = vi.fn();
    render(
      <FilterToolbar {...defaultProps({ toggleFilter })} />
    );
    const checkbox = screen.getByLabelText('Has negotiation position');
    expect(checkbox).not.toBeChecked();
    const user = userEvent.setup();
    await user.click(checkbox);
    expect(toggleFilter).toHaveBeenCalledWith('negotiationOnly');
  });

  it('negotiation-only checkbox is checked when negotiationOnly is true', () => {
    const filters: FilterState = {
      severities: new Set(SEVERITIES),
      categories: new Set(CATEGORIES),
      priorities: new Set(['pre-bid', 'pre-sign', 'monitor']),
      negotiationOnly: true,
    };
    render(<FilterToolbar {...defaultProps({ filters })} />);
    expect(
      screen.getByLabelText('Has negotiation position')
    ).toBeChecked();
  });

  it('renders mocked MultiSelectDropdown stubs', () => {
    render(<FilterToolbar {...defaultProps()} />);
    expect(screen.getByTestId('dropdown-Category')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-Severity')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-Priority')).toBeInTheDocument();
  });

  it('renders Scope Intel button when hasScopeIntelData is true', () => {
    render(<FilterToolbar {...defaultProps()} hasScopeIntelData={true} />);
    expect(screen.getByText('Scope Intel')).toBeInTheDocument();
  });

  it('does NOT render Scope Intel button when hasScopeIntelData is false', () => {
    render(<FilterToolbar {...defaultProps()} hasScopeIntelData={false} />);
    expect(screen.queryByText('Scope Intel')).not.toBeInTheDocument();
  });

  it('does NOT render Scope Intel button when hasScopeIntelData is undefined', () => {
    render(<FilterToolbar {...defaultProps()} />);
    expect(screen.queryByText('Scope Intel')).not.toBeInTheDocument();
  });

  it('hides filter dropdowns when viewMode is scope-intel', () => {
    render(
      <FilterToolbar {...defaultProps({ viewMode: 'scope-intel' as ViewMode })} hasScopeIntelData={true} />
    );
    expect(screen.queryByTestId('dropdown-Category')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dropdown-Severity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dropdown-Priority')).not.toBeInTheDocument();
  });
});
