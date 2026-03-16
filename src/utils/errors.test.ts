import { describe, it, expect } from 'vitest';
import { classifyError, formatApiError, type ClassifiedError } from './errors';

describe('classifyError', () => {
  // --- Network errors ---

  it('classifies TypeError("Failed to fetch") as network error', () => {
    const result = classifyError(new TypeError('Failed to fetch'));
    expect(result.type).toBe('network');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('Network error');
  });

  it('classifies Error with "NetworkError" in message as network error', () => {
    const result = classifyError(new Error('NetworkError when attempting to fetch'));
    expect(result.type).toBe('network');
    expect(result.retryable).toBe(true);
  });

  // --- Timeout errors ---

  it('classifies Error with "HeadersTimeoutError" as timeout', () => {
    const result = classifyError(new Error('HeadersTimeoutError'));
    expect(result.type).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('classifies Error with "timeout" in message as timeout', () => {
    const result = classifyError(new Error('Request timeout'));
    expect(result.type).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('classifies Error with "ETIMEDOUT" as timeout', () => {
    const result = classifyError(new Error('ETIMEDOUT'));
    expect(result.type).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  // --- Storage errors ---

  it('classifies DOMException with QuotaExceededError as storage error', () => {
    const result = classifyError(new DOMException('quota exceeded', 'QuotaExceededError'));
    expect(result.type).toBe('storage');
    expect(result.retryable).toBe(false);
  });

  it('classifies DOMException with NS_ERROR_DOM_QUOTA_REACHED as storage error', () => {
    const result = classifyError(new DOMException('quota', 'NS_ERROR_DOM_QUOTA_REACHED'));
    expect(result.type).toBe('storage');
    expect(result.retryable).toBe(false);
  });

  // --- API errors ---

  it('classifies object with status 429 as retryable API error', () => {
    const result = classifyError({ status: 429 });
    expect(result.type).toBe('api');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('Too many requests');
  });

  it('classifies object with status 401 as non-retryable API auth error', () => {
    const result = classifyError({ status: 401 });
    expect(result.type).toBe('api');
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toContain('Authentication');
  });

  it('classifies object with status 500 as non-retryable API server error', () => {
    const result = classifyError({ status: 500 });
    expect(result.type).toBe('api');
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toContain('Server error (500)');
  });

  // --- Unknown errors ---

  it('classifies plain string as unknown error', () => {
    const result = classifyError('some string');
    expect(result.type).toBe('unknown');
    expect(result.retryable).toBe(false);
  });

  it('classifies regular Error as unknown with message preserved', () => {
    const result = classifyError(new Error('Something broke'));
    expect(result.type).toBe('unknown');
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toBe('Something broke');
  });
});

describe('formatApiError', () => {
  const classified: ClassifiedError = {
    type: 'network',
    userMessage: 'Network error. Please check your connection and try again.',
    retryable: true,
    originalError: new TypeError('Failed to fetch'),
  };

  it('transforms ClassifiedError into ApiErrorResponse', () => {
    const result = formatApiError(classified);
    expect(result.error).toBe(classified.userMessage);
    expect(result.type).toBe('network');
    expect(result.retryable).toBe(true);
  });

  it('includes details when provided', () => {
    const result = formatApiError(classified, { field: 'x' });
    expect(result.details).toEqual({ field: 'x' });
  });

  it('omits details when not provided', () => {
    const result = formatApiError(classified);
    expect(result).not.toHaveProperty('details');
  });
});
