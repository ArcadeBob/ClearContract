import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test/render';

const mockUseAuth = vi.fn();

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">LoginPage</div>,
}));

vi.mock('./components/LoadingScreen', () => ({
  LoadingScreen: () => <div data-testid="loading-screen">LoadingScreen</div>,
}));

import { App } from './App';

describe('App auth gate', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('renders LoginPage when session is null', () => {
    mockUseAuth.mockReturnValue({ session: null, isLoading: false, signOut: vi.fn() });
    render(<App />);

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  });

  it('renders LoadingScreen when isLoading is true', () => {
    mockUseAuth.mockReturnValue({ session: null, isLoading: true, signOut: vi.fn() });
    render(<App />);

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('renders full app (Sidebar) when session exists', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: '1' } },
      isLoading: false,
      signOut: vi.fn(),
    });
    render(<App />);

    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });
});
