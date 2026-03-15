import { useState, useEffect, useRef, useCallback } from 'react';

interface UseFieldValidationOptions {
  initialValue: string;
  validate: (value: string) => { valid: boolean; error?: string; warning?: string; formatted?: string };
  onSave: (value: string) => void;
}

interface UseFieldValidationReturn {
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus: () => void;
    onBlur: () => void;
  };
  error: string | null;
  warning: string | null;
  showSaved: boolean;
}

export function useFieldValidation(options: UseFieldValidationOptions): UseFieldValidationReturn {
  const { initialValue, validate, onSave } = options;

  const [localValue, setLocalValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const focusedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync localValue when initialValue changes externally (but not while focused)
  useEffect(() => {
    if (!focusedRef.current) {
      setLocalValue(initialValue);
    }
  }, [initialValue]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    setError(null);
  }, []);

  const onFocus = useCallback(() => {
    focusedRef.current = true;
    setError(null);
  }, []);

  const onBlur = useCallback(() => {
    focusedRef.current = false;

    const result = validate(localValue);

    if (!result.valid) {
      setError(result.error || null);
      setLocalValue(initialValue); // revert to last saved
      return;
    }

    setError(null);
    setWarning(result.warning || null);

    const finalValue = result.formatted || localValue;
    setLocalValue(finalValue);

    if (finalValue !== initialValue) {
      onSave(finalValue);
      setShowSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }
  }, [localValue, initialValue, validate, onSave]);

  return {
    inputProps: { value: localValue, onChange, onFocus, onBlur },
    error,
    warning,
    showSaved,
  };
}
