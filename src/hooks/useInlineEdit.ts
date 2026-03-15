import { useState, useCallback, useEffect, useRef } from 'react';

interface UseInlineEditOptions {
  initialValue: string;
  autoFocus?: boolean;
  validate?: (value: string) => string;
  onSave: (value: string) => void;
}

interface UseInlineEditReturn {
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  startEditing: () => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function useInlineEdit({
  initialValue,
  autoFocus = false,
  validate,
  onSave,
}: UseInlineEditOptions): UseInlineEditReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setEditValue(initialValue);
    setIsEditing(true);
  }, [initialValue]);

  const commitEdit = useCallback(() => {
    const finalValue = validate ? validate(editValue) : editValue;
    if (finalValue !== '' && finalValue !== initialValue) {
      onSave(finalValue);
    }
    setIsEditing(false);
  }, [editValue, initialValue, validate, onSave]);

  const cancelEdit = useCallback(() => {
    setEditValue(initialValue);
    setIsEditing(false);
  }, [initialValue]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') cancelEdit();
    },
    [commitEdit, cancelEdit],
  );

  useEffect(() => {
    if (isEditing && autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, autoFocus]);

  return {
    isEditing,
    editValue,
    setEditValue,
    startEditing,
    commitEdit,
    cancelEdit,
    onKeyDown,
    inputRef,
  };
}
