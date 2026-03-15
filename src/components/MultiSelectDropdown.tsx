import { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface MultiSelectDropdownProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: Set<T>;
  onChange: (selected: Set<T>) => void;
  renderOption?: (option: T) => React.ReactNode;
}

export function MultiSelectDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  renderOption,
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const allSelected = selected.size === options.length;

  const handleToggle = (option: T) => {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange(next);
  };

  const selectAll = () => {
    onChange(new Set(options));
  };

  const clearAll = () => {
    onChange(new Set<T>());
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span>{label}</span>
        {!allSelected && selected.size > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
            {selected.size}/{options.length}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
              <button
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(option)}
                    onChange={() => handleToggle(option)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {renderOption ? renderOption(option) : option}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
