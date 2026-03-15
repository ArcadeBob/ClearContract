import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '../contexts/ToastProvider';

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
