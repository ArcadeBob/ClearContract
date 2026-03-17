import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/render';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';

const mockSignInWithPassword = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
    mockSignInWithPassword.mockResolvedValue({ error: null, data: { user: {}, session: {} } });
  });

  it('renders email and password inputs and sign in button', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders branding with ClearContract heading', () => {
    render(<LoginPage />);
    expect(screen.getByText('ClearContract')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered Contract Review')).toBeInTheDocument();
  });

  it('calls signInWithPassword on form submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows "Invalid email or password" on auth error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
      data: { user: null, session: null },
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
    });
  });

  it('disables button while submitting', async () => {
    // Never resolve so the button stays disabled
    mockSignInWithPassword.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  it('clears error when user types in email field', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
      data: { user: null, session: null },
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'x');

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('email input has autofocus', () => {
    render(<LoginPage />);
    // React's autoFocus prop sets focus imperatively in jsdom, check via document.activeElement
    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
  });
});
