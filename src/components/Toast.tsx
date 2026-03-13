import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastData {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

const styleMap = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    button: 'bg-red-100 hover:bg-red-200 text-red-700',
    Icon: AlertCircle,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    button: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    button: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
    Icon: Info,
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    button: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700',
    Icon: CheckCircle2,
  },
};

export function Toast({ type, message, onRetry, onDismiss }: ToastData) {
  const { container, button, Icon } = styleMap[type];

  useEffect(() => {
    // Don't auto-dismiss if retry is available -- user needs time to click
    if (onRetry) return;

    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onRetry, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg rounded-lg border shadow-lg p-4 flex items-center gap-3 ${container}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`px-3 py-1 rounded text-sm font-medium ${button}`}
        >
          Retry
        </button>
      )}
      <button
        onClick={onDismiss}
        className="p-1 rounded hover:bg-black/5"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
