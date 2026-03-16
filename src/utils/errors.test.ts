import { describe, it, expect } from 'vitest';
import { classifyError } from './errors';

describe('classifyError', () => {
  it('classifies network errors', () => {
    const err = new TypeError('Failed to fetch');
    const result = classifyError(err);
    expect(result.type).toBe('network');
    expect(result.retryable).toBe(true);
  });

  it('classifies unknown errors', () => {
    const result = classifyError('some string error');
    expect(result.type).toBe('unknown');
    expect(result.retryable).toBe(false);
  });
});
