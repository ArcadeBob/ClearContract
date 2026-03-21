import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { MultiSelectDropdown } from './MultiSelectDropdown';

describe('MultiSelectDropdown', () => {
  it('renders label and count badge when partially selected', () => {
    const options = ['Critical', 'High', 'Medium'] as const;
    render(
      <MultiSelectDropdown
        label="Severity"
        options={options}
        selected={new Set(['Critical'])}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('renders without count badge when all selected', () => {
    const options = ['Critical', 'High'] as const;
    render(
      <MultiSelectDropdown
        label="Severity"
        options={options}
        selected={new Set(['Critical', 'High'])}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.queryByText('2/2')).not.toBeInTheDocument();
  });
});
