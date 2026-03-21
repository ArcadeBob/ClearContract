import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { CategoryFilter } from './CategoryFilter';

describe('CategoryFilter', () => {
  it('renders All Categories button and category buttons', () => {
    render(
      <CategoryFilter
        categories={['Legal Issues', 'Scope of Work']}
        selectedCategory="All"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Legal Issues')).toBeInTheDocument();
    expect(screen.getByText('Scope of Work')).toBeInTheDocument();
  });
});
