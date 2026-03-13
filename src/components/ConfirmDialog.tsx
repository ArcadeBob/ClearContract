import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClassName?: string;
  icon?: 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  confirmClassName,
  icon = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          {icon === 'info' ? (
            <RefreshCw className="w-10 h-10 text-blue-500 mb-3" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
          )}
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-2">{message}</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={confirmClassName || "px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
