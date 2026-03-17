import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../test/render';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders all navigation items', () => {
    render(
      <Sidebar activeView="dashboard" onNavigate={vi.fn()} contractCount={3} onSignOut={vi.fn()} />
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Upload & Review')).toBeInTheDocument();
    expect(screen.getByText('All Contracts')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders company branding', () => {
    render(
      <Sidebar activeView="dashboard" onNavigate={vi.fn()} contractCount={0} onSignOut={vi.fn()} />
    );
    expect(screen.getByText('Clean Glass')).toBeInTheDocument();
    expect(screen.getByText('Installation Inc.')).toBeInTheDocument();
  });

  it('renders AI powered footer', () => {
    render(
      <Sidebar activeView="dashboard" onNavigate={vi.fn()} contractCount={0} onSignOut={vi.fn()} />
    );
    expect(screen.getByText('AI Powered')).toBeInTheDocument();
  });

  it('highlights active view -- dashboard', () => {
    render(
      <Sidebar activeView="dashboard" onNavigate={vi.fn()} contractCount={0} onSignOut={vi.fn()} />
    );
    const dashBtn = screen.getByText('Dashboard').closest('button')!;
    expect(dashBtn).toHaveClass('text-blue-400');

    const uploadBtn = screen.getByText('Upload & Review').closest('button')!;
    expect(uploadBtn).not.toHaveClass('text-blue-400');
    expect(uploadBtn).toHaveClass('text-slate-400');
  });

  it('highlights active view -- contracts', () => {
    render(
      <Sidebar activeView="contracts" onNavigate={vi.fn()} contractCount={2} onSignOut={vi.fn()} />
    );
    const contractsBtn = screen
      .getByText('All Contracts')
      .closest('button')!;
    expect(contractsBtn).toHaveClass('text-blue-400');

    const dashBtn = screen.getByText('Dashboard').closest('button')!;
    expect(dashBtn).toHaveClass('text-slate-400');
  });

  it('highlights active view -- settings', () => {
    render(
      <Sidebar activeView="settings" onNavigate={vi.fn()} contractCount={0} onSignOut={vi.fn()} />
    );
    const settingsBtn = screen.getByText('Settings').closest('button')!;
    expect(settingsBtn).toHaveClass('text-blue-400');
  });

  it('navigates to dashboard on click', async () => {
    const onNavigate = vi.fn();
    render(
      <Sidebar activeView="contracts" onNavigate={onNavigate} contractCount={0} onSignOut={vi.fn()} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Dashboard'));
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('navigates to upload on click', async () => {
    const onNavigate = vi.fn();
    render(
      <Sidebar activeView="dashboard" onNavigate={onNavigate} contractCount={0} onSignOut={vi.fn()} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Upload & Review'));
    expect(onNavigate).toHaveBeenCalledWith('upload');
  });

  it('navigates to contracts on click', async () => {
    const onNavigate = vi.fn();
    render(
      <Sidebar activeView="dashboard" onNavigate={onNavigate} contractCount={0} onSignOut={vi.fn()} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('All Contracts'));
    expect(onNavigate).toHaveBeenCalledWith('contracts');
  });

  it('navigates to settings on click', async () => {
    const onNavigate = vi.fn();
    render(
      <Sidebar activeView="dashboard" onNavigate={onNavigate} contractCount={0} onSignOut={vi.fn()} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Settings'));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('shows contract count badge when count > 0', () => {
    render(
      <Sidebar activeView="dashboard" onNavigate={vi.fn()} contractCount={5} onSignOut={vi.fn()} />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render badge span when count is 0', () => {
    const { container } = render(
      <Sidebar activeView="dashboard" onNavigate={vi.fn()} contractCount={0} onSignOut={vi.fn()} />
    );
    // When contractCount is 0, {item.badge && <span>...} short-circuits
    // to 0 (React renders the falsy number), so the styled badge span is NOT rendered.
    const badgeSpans = container.querySelectorAll('span.bg-slate-800');
    expect(badgeSpans.length).toBe(0);
  });

  it('renders Sign Out button that calls onSignOut', async () => {
    const mockSignOut = vi.fn();
    render(
      <Sidebar activeView="dashboard" onNavigate={vi.fn()} contractCount={0} onSignOut={mockSignOut} />
    );

    expect(screen.getByText('Sign Out')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalledOnce();
  });
});
