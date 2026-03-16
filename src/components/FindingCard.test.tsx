import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../test/render';
import { createFinding } from '../test/factories';
import { FindingCard } from './FindingCard';
import { SEVERITIES } from '../types/contract';

describe('FindingCard', () => {
  // 1. Basic rendering (fully-loaded finding)
  it('renders all sections for a fully-loaded finding', () => {
    const finding = createFinding({
      title: 'Indemnification Clause',
      description: 'Broad form indemnification detected.',
      recommendation: 'Negotiate mutual indemnification.',
      clauseText: 'Contractor shall indemnify...',
      clauseReference: 'Section 5.2',
      explanation: 'This exposes you to unlimited liability.',
      negotiationPosition: 'Request strike-through of broad form language.',
      crossReferences: ['Insurance Requirements'],
      actionPriority: 'pre-bid',
    });

    render(<FindingCard finding={finding} index={0} />);

    expect(screen.getByText('Indemnification Clause')).toBeInTheDocument();
    expect(screen.getByText('Broad form indemnification detected.')).toBeInTheDocument();
    expect(screen.getByText('Negotiate mutual indemnification.')).toBeInTheDocument();
    expect(screen.getByText('Contractor shall indemnify...')).toBeInTheDocument();
    expect(screen.getByText('This exposes you to unlimited liability.')).toBeInTheDocument();
    expect(screen.getByText('Request strike-through of broad form language.')).toBeInTheDocument();
    expect(screen.getByText('Insurance Requirements')).toBeInTheDocument();
    expect(screen.getByText('Section 5.2')).toBeInTheDocument();
    expect(screen.getByText('Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Why This Matters')).toBeInTheDocument();
    expect(screen.getByText('Negotiation Position')).toBeInTheDocument();
  });

  // 2. Minimal finding (only required fields)
  it('hides optional sections when fields are empty', () => {
    const finding = createFinding({
      title: 'Minimal Issue',
      description: 'Basic description.',
      recommendation: '',
      clauseText: '',
      explanation: '',
      negotiationPosition: '',
      crossReferences: [],
      clauseReference: '',
    });

    render(<FindingCard finding={finding} index={0} />);

    expect(screen.getByText('Minimal Issue')).toBeInTheDocument();
    expect(screen.getByText('Basic description.')).toBeInTheDocument();
    expect(screen.queryByText('Recommendation')).not.toBeInTheDocument();
    expect(screen.queryByText('Why This Matters')).not.toBeInTheDocument();
    expect(screen.queryByText('Negotiation Position')).not.toBeInTheDocument();
    expect(screen.queryByText('See also:')).not.toBeInTheDocument();
    expect(screen.getByText('+ Add note')).toBeInTheDocument();
  });

  // 3. All severity levels
  it.each(SEVERITIES)('renders %s severity badge', (severity) => {
    const finding = createFinding({ severity });
    render(<FindingCard finding={finding} index={0} />);
    expect(screen.getByText(severity)).toBeInTheDocument();
  });

  // 4. Resolved state
  it('shows resolved styling with line-through and correct button title', () => {
    const finding = createFinding({ title: 'Resolved Finding', resolved: true });
    render(<FindingCard finding={finding} index={0} />);

    expect(screen.getByText('Resolved Finding')).toHaveClass('line-through');
    expect(screen.getByTitle('Mark unresolved')).toBeInTheDocument();
  });

  // 5. Unresolved state
  it('shows unresolved styling without line-through', () => {
    const finding = createFinding({ title: 'Active Finding', resolved: false });
    render(<FindingCard finding={finding} index={0} />);

    expect(screen.getByText('Active Finding')).not.toHaveClass('line-through');
    expect(screen.getByTitle('Mark resolved')).toBeInTheDocument();
  });

  // 6. Toggle resolved callback
  it('calls onToggleResolved with finding id when resolve button clicked', async () => {
    const onToggleResolved = vi.fn();
    const finding = createFinding({ resolved: false });
    const user = userEvent.setup();

    render(<FindingCard finding={finding} index={0} onToggleResolved={onToggleResolved} />);

    await user.click(screen.getByTitle('Mark resolved'));
    expect(onToggleResolved).toHaveBeenCalledWith(finding.id);
  });

  // 7. Note add flow (full interaction)
  it('allows adding a new note via textarea and Save button', async () => {
    const onUpdateNote = vi.fn();
    const finding = createFinding({ note: '' });
    const user = userEvent.setup();

    render(<FindingCard finding={finding} index={0} onUpdateNote={onUpdateNote} />);

    await user.click(screen.getByText('+ Add note'));
    expect(screen.getByPlaceholderText('Add your note...')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Add your note...'), 'My analysis note');
    await user.click(screen.getByText('Save'));

    expect(onUpdateNote).toHaveBeenCalledWith(finding.id, 'My analysis note');
  });

  // 8. Note cancel flow
  it('cancels note editing and restores add button', async () => {
    const finding = createFinding({ note: '' });
    const user = userEvent.setup();

    render(<FindingCard finding={finding} index={0} />);

    await user.click(screen.getByText('+ Add note'));
    await user.type(screen.getByPlaceholderText('Add your note...'), 'some text');
    await user.click(screen.getByText('Cancel'));

    expect(screen.queryByPlaceholderText('Add your note...')).not.toBeInTheDocument();
    expect(screen.getByText('+ Add note')).toBeInTheDocument();
  });

  // 9. Existing note display
  it('displays an existing note with heading and no add button', () => {
    const finding = createFinding({ note: 'Previously saved note' });

    render(<FindingCard finding={finding} index={0} />);

    expect(screen.getByText('Previously saved note')).toBeInTheDocument();
    expect(screen.getByText('Your Note')).toBeInTheDocument();
    expect(screen.queryByText('+ Add note')).not.toBeInTheDocument();
  });

  // 10. Delete note confirmation flow
  it('deletes a note after confirming in the dialog', async () => {
    const onUpdateNote = vi.fn();
    const finding = createFinding({ note: 'Note to delete' });
    const user = userEvent.setup();

    render(<FindingCard finding={finding} index={0} onUpdateNote={onUpdateNote} />);

    await user.click(screen.getByTitle('Delete note'));

    // ConfirmDialog renders via createPortal to document.body -- screen queries cover it
    expect(screen.getByText('Delete Note')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this note? This cannot be undone.')).toBeInTheDocument();

    await user.click(screen.getByText('Delete'));

    expect(onUpdateNote).toHaveBeenCalledWith(finding.id, undefined);
  });

  // 11. Delete note cancel flow
  it('keeps the note when cancel is clicked in delete dialog', async () => {
    const onUpdateNote = vi.fn();
    const finding = createFinding({ note: 'Keep this note' });
    const user = userEvent.setup();

    render(<FindingCard finding={finding} index={0} onUpdateNote={onUpdateNote} />);

    await user.click(screen.getByTitle('Delete note'));
    await user.click(screen.getByText('Cancel'));

    expect(onUpdateNote).not.toHaveBeenCalled();
    expect(screen.getByText('Keep this note')).toBeInTheDocument();
  });
});
