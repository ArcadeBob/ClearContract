import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/render';
import { act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

let authChangeCallback: (event: string, session: unknown) => void;
const mockUnsubscribe = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authChangeCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
      signOut: vi.fn(),
    },
  },
}));

function TestConsumer() {
  const { session, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="session">{session ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockUnsubscribe.mockClear();
  });

  it('isLoading is true before onAuthStateChange fires', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('isLoading becomes false after INITIAL_SESSION event', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      authChangeCallback('INITIAL_SESSION', null);
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('session is set when SIGNED_IN event fires', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      authChangeCallback('SIGNED_IN', { user: { id: '123' } });
    });

    expect(screen.getByTestId('session')).toHaveTextContent('yes');
  });

  it('session is cleared on SIGNED_OUT event', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      authChangeCallback('SIGNED_IN', { user: { id: '123' } });
    });
    expect(screen.getByTestId('session')).toHaveTextContent('yes');

    act(() => {
      authChangeCallback('SIGNED_OUT', null);
    });
    expect(screen.getByTestId('session')).toHaveTextContent('no');
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
