import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement } from 'react';
import { ToastProvider } from '../contexts/ToastProvider';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
export { screen, within, waitFor } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
