import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from '../test/render';
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

  // --- Subcategory grouping tests (UX-01) ---

  it('renders subcategory headers when Scope of Work has 2+ distinct sourcePass values', () => {
    const findings = [
      createFinding({ title: 'Extraction 1', category: 'Scope of Work', sourcePass: 'scope-extraction' }),
      createFinding({ title: 'Spec Gap 1', category: 'Scope of Work', sourcePass: 'spec-reconciliation' }),
      createFinding({ title: 'Extraction 2', category: 'Scope of Work', sourcePass: 'scope-extraction' }),
    ];
    render(<CategorySection category="Scope of Work" findings={findings} defaultExpanded={true} />);
    expect(screen.getByText('Scope Items')).toBeInTheDocument();
    expect(screen.getByText('Spec Gaps')).toBeInTheDocument();
  });

  it('does NOT render subcategory headers when all findings share the same sourcePass', () => {
    const findings = [
      createFinding({ title: 'Extraction 1', category: 'Scope of Work', sourcePass: 'scope-extraction' }),
      createFinding({ title: 'Extraction 2', category: 'Scope of Work', sourcePass: 'scope-extraction' }),
    ];
    render(<CategorySection category="Scope of Work" findings={findings} defaultExpanded={true} />);
    expect(screen.queryByText('Scope Items')).not.toBeInTheDocument();
  });

  it('does NOT render subcategory headers for non-Scope of Work categories', () => {
    const findings = [
      createFinding({ title: 'Legal 1', category: 'Legal Issues', sourcePass: 'scope-extraction' }),
      createFinding({ title: 'Legal 2', category: 'Legal Issues', sourcePass: 'spec-reconciliation' }),
    ];
    render(<CategorySection category="Legal Issues" findings={findings} defaultExpanded={true} />);
    expect(screen.queryByText('Scope Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Spec Gaps')).not.toBeInTheDocument();
  });

  it('subcategory headers show correct finding count', () => {
    const findings = [
      createFinding({ title: 'E1', category: 'Scope of Work', sourcePass: 'scope-extraction' }),
      createFinding({ title: 'E2', category: 'Scope of Work', sourcePass: 'scope-extraction' }),
      createFinding({ title: 'S1', category: 'Scope of Work', sourcePass: 'spec-reconciliation' }),
    ];
    render(<CategorySection category="Scope of Work" findings={findings} defaultExpanded={true} />);
    expect(screen.getByText('(2 findings)', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('(1 finding)', { exact: false })).toBeInTheDocument();
  });

  it('subcategory headers are clickable and toggle collapse/expand', async () => {
    const findings = [
      createFinding({ title: 'Extraction Item', category: 'Scope of Work', sourcePass: 'scope-extraction' }),
      createFinding({ title: 'Spec Gap Item', category: 'Scope of Work', sourcePass: 'spec-reconciliation' }),
    ];
    render(<CategorySection category="Scope of Work" findings={findings} defaultExpanded={true} />);

    // Both findings visible initially
    expect(screen.getByText('Extraction Item')).toBeInTheDocument();
    expect(screen.getByText('Spec Gap Item')).toBeInTheDocument();

    // Click the "Scope Items" subcategory header to collapse it
    const user = userEvent.setup();
    await user.click(screen.getByText('Scope Items'));

    // Extraction Item should be hidden, Spec Gap Item still visible
    expect(screen.queryByText('Extraction Item')).not.toBeInTheDocument();
    expect(screen.getByText('Spec Gap Item')).toBeInTheDocument();
  });
});
