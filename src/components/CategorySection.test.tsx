import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { CategorySection } from './CategorySection';
import { createFinding } from '../test/factories';

describe('CategorySection', () => {
  it('renders category name and finding count', () => {
    const findings = [
      createFinding({ title: 'Finding A', category: 'Legal Issues', severity: 'High' }),
      createFinding({ title: 'Finding B', category: 'Legal Issues', severity: 'Medium' }),
    ];
    render(<CategorySection category="Legal Issues" findings={findings} />);
    expect(screen.getAllByText('Legal Issues').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(2 findings)')).toBeInTheDocument();
  });

  it('renders finding cards when expanded', () => {
    const findings = [createFinding({ title: 'Test Finding' })];
    render(<CategorySection category="Scope of Work" findings={findings} defaultExpanded={true} />);
    expect(screen.getByText('Test Finding')).toBeInTheDocument();
  });
});
