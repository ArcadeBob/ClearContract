import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders error toast with message', () => {
    render(<Toast type="error" message="Something went wrong" onDismiss={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders success toast with message', () => {
    render(<Toast type="success" message="Saved successfully" onDismiss={vi.fn()} />);
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    render(
      <Toast type="error" message="Failed" onDismiss={vi.fn()} onRetry={vi.fn()} />
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders dismiss button', () => {
    render(<Toast type="info" message="Info" onDismiss={vi.fn()} />);
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });
});
