import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useFieldValidation } from '../useFieldValidation';

describe('useFieldValidation', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function fireChange(result: { current: ReturnType<typeof useFieldValidation> }, value: string) {
    act(() => {
      result.current.inputProps.onChange({
        target: { value },
      } as React.ChangeEvent<HTMLInputElement>);
    });
  }

  // Test 1
  it('initial state has value=initialValue, error=null, warning=null, showSaved=false', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    expect(result.current.inputProps.value).toBe('hello');
    expect(result.current.error).toBeNull();
    expect(result.current.warning).toBeNull();
    expect(result.current.showSaved).toBe(false);
  });

  // Test 2
  it('onChange updates inputProps.value and clears error', () => {
    const validate = vi.fn(() => ({ valid: false, error: 'bad' }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    // Trigger an error first via blur
    act(() => { result.current.inputProps.onBlur(); });
    expect(result.current.error).toBe('bad');
    // Now onChange should clear error
    fireChange(result, 'new');
    expect(result.current.inputProps.value).toBe('new');
    expect(result.current.error).toBeNull();
  });

  // Test 3
  it('onBlur with invalid input sets error and reverts value to initialValue', () => {
    const validate = vi.fn(() => ({ valid: false, error: 'Invalid' }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'bad');
    act(() => { result.current.inputProps.onBlur(); });
    expect(result.current.error).toBe('Invalid');
    expect(result.current.inputProps.value).toBe('hello');
  });

  // Test 4
  it('onBlur with invalid input does NOT call onSave', () => {
    const validate = vi.fn(() => ({ valid: false, error: 'Invalid' }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'bad');
    act(() => { result.current.inputProps.onBlur(); });
    expect(onSave).not.toHaveBeenCalled();
  });

  // Test 5
  it('onBlur with valid changed input calls onSave with value', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'world');
    act(() => { result.current.inputProps.onBlur(); });
    expect(onSave).toHaveBeenCalledWith('world');
  });

  // Test 6
  it('onBlur with valid changed input sets showSaved=true', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'world');
    act(() => { result.current.inputProps.onBlur(); });
    expect(result.current.showSaved).toBe(true);
  });

  // Test 7
  it('showSaved clears to false after 2000ms', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'world');
    act(() => { result.current.inputProps.onBlur(); });
    expect(result.current.showSaved).toBe(true);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.showSaved).toBe(false);
  });

  // Test 8
  it('onBlur with valid unchanged input does NOT call onSave and does NOT set showSaved', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    // Blur without changing value
    act(() => { result.current.inputProps.onBlur(); });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.showSaved).toBe(false);
  });

  // Test 9
  it('onBlur with valid + formatted value uses formatted value for save and display', () => {
    const validate = vi.fn(() => ({ valid: true, formatted: 'FORMATTED' }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'raw');
    act(() => { result.current.inputProps.onBlur(); });
    expect(onSave).toHaveBeenCalledWith('FORMATTED');
    expect(result.current.inputProps.value).toBe('FORMATTED');
  });

  // Test 10
  it('onBlur with valid + warning sets warning string', () => {
    const validate = vi.fn(() => ({ valid: true, warning: 'Heads up' }));
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'different');
    act(() => { result.current.inputProps.onBlur(); });
    expect(result.current.warning).toBe('Heads up');
  });

  // Test 11
  it('external initialValue change syncs localValue when not focused', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result, rerender } = renderHook(
      ({ initialValue }) => useFieldValidation({ initialValue, validate, onSave }),
      { initialProps: { initialValue: 'v1' } }
    );
    expect(result.current.inputProps.value).toBe('v1');
    rerender({ initialValue: 'v2' });
    expect(result.current.inputProps.value).toBe('v2');
  });

  // Test 12
  it('external initialValue change does NOT sync when focused', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result, rerender } = renderHook(
      ({ initialValue }) => useFieldValidation({ initialValue, validate, onSave }),
      { initialProps: { initialValue: 'v1' } }
    );
    act(() => { result.current.inputProps.onFocus(); });
    rerender({ initialValue: 'v2' });
    expect(result.current.inputProps.value).toBe('v1');
  });

  // Test 13
  it('timer cleanup on unmount (no leaked timers)', () => {
    const validate = vi.fn(() => ({ valid: true }));
    const onSave = vi.fn();
    const { result, unmount } = renderHook(() =>
      useFieldValidation({ initialValue: 'hello', validate, onSave })
    );
    fireChange(result, 'world');
    act(() => { result.current.inputProps.onBlur(); });
    expect(result.current.showSaved).toBe(true);
    unmount();
    // Advancing timers after unmount should not throw
    act(() => { vi.advanceTimersByTime(3000); });
  });
});
