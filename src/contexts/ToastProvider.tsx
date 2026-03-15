import { createContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast } from '../components/Toast';

interface ToastState {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  onRetry?: () => void;
}

export interface ToastContextValue {
  showToast: (opts: { type: 'error' | 'warning' | 'info' | 'success'; message: string; onRetry?: () => void }) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
    clearTimer();
  }, [clearTimer]);

  const showToast = useCallback((opts: ToastState) => {
    clearTimer();
    setToast(opts);

    // Auto-dismiss after 3 seconds unless onRetry is present
    if (!opts.onRetry) {
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, 3000);
    }
  }, [clearTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onRetry={toast.onRetry}
            onDismiss={dismissToast}
          />
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
