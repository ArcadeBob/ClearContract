import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="glass-panel max-w-md w-full p-8 text-center space-y-4">
          <div className="text-4xl">⚠</div>
          <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            {this.state.error?.message?.slice(0, 200) || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => { window.location.reload(); }}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
