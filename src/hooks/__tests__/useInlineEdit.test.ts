import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInlineEdit } from '../useInlineEdit';

describe('useInlineEdit', () => {
  let onSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn();
  });

  it('initial state has isEditing=false', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'hello', onSave })
    );
    expect(result.current.isEditing).toBe(false);
  });

  it('startEditing sets isEditing=true and editValue to initialValue', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'hello', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editValue).toBe('hello');
  });

  it('commitEdit with changed value calls onSave with new value', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'original', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    act(() => {
      result.current.setEditValue('updated');
    });
    act(() => {
      result.current.commitEdit();
    });
    expect(onSave).toHaveBeenCalledWith('updated');
  });

  it('commitEdit with unchanged value does NOT call onSave', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'same', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    // Don't change editValue
    act(() => {
      result.current.commitEdit();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('commitEdit with empty string does NOT call onSave', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'original', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    act(() => {
      result.current.setEditValue('');
    });
    act(() => {
      result.current.commitEdit();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('commitEdit always sets isEditing=false', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'hello', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    expect(result.current.isEditing).toBe(true);
    act(() => {
      result.current.commitEdit();
    });
    expect(result.current.isEditing).toBe(false);
  });

  it('cancelEdit reverts editValue to initialValue and sets isEditing=false', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'original', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    act(() => {
      result.current.setEditValue('changed');
    });
    act(() => {
      result.current.cancelEdit();
    });
    expect(result.current.editValue).toBe('original');
    expect(result.current.isEditing).toBe(false);
  });

  it('onKeyDown Enter triggers commitEdit behavior', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'original', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    act(() => {
      result.current.setEditValue('via-enter');
    });
    act(() => {
      result.current.onKeyDown({ key: 'Enter' } as React.KeyboardEvent);
    });
    expect(onSave).toHaveBeenCalledWith('via-enter');
    expect(result.current.isEditing).toBe(false);
  });

  it('onKeyDown Escape triggers cancelEdit behavior', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initialValue: 'original', onSave })
    );
    act(() => {
      result.current.startEditing();
    });
    act(() => {
      result.current.setEditValue('will-be-cancelled');
    });
    act(() => {
      result.current.onKeyDown({ key: 'Escape' } as React.KeyboardEvent);
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.editValue).toBe('original');
    expect(result.current.isEditing).toBe(false);
  });

  it('validate function transforms value before save comparison', () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: 'hello',
        validate: (v) => v.trim(),
        onSave,
      })
    );
    act(() => {
      result.current.startEditing();
    });
    act(() => {
      result.current.setEditValue('  world  ');
    });
    act(() => {
      result.current.commitEdit();
    });
    expect(onSave).toHaveBeenCalledWith('world');
  });

  it('validate returns empty string prevents onSave call', () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: 'x',
        validate: () => '',
        onSave,
      })
    );
    act(() => {
      result.current.startEditing();
    });
    act(() => {
      result.current.setEditValue('anything');
    });
    act(() => {
      result.current.commitEdit();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
