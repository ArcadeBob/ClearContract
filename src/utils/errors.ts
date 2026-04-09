/**
 * Error classification utilities.
 * Isomorphic (no React or DOM imports) -- safe for client and server use.
 */

export type ErrorType = 'network' | 'api' | 'validation' | 'storage' | 'timeout' | 'unknown';

export interface ClassifiedError {
  type: ErrorType;
  userMessage: string;
  retryable: boolean;
  originalError: unknown;
}

export interface ApiErrorResponse {
  error: string;
  type: ErrorType;
  retryable: boolean;
  details?: unknown;
}

/**
 * Classifies an unknown error into a typed error with user-friendly message
 * and retryable flag.
 */
export function classifyError(err: unknown): ClassifiedError {
  const message = err instanceof Error ? err.message : String(err);

  // Network errors
  if (
    (err instanceof TypeError && message === 'Failed to fetch') ||
    message.includes('NetworkError')
  ) {
    return {
      type: 'network',
      userMessage: 'Network error. Please check your connection and try again.',
      retryable: true,
      originalError: err,
    };
  }

  // Timeout and abort errors (AbortController fired during long API calls)
  if (
    message.includes('HeadersTimeoutError') ||
    message.includes('timeout') ||
    message.includes('ETIMEDOUT') ||
    message.includes('aborted') ||
    message.includes('AbortError')
  ) {
    return {
      type: 'timeout',
      userMessage: 'The request timed out. Please try again.',
      retryable: true,
      originalError: err,
    };
  }

  // Storage quota errors
  if (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return {
      type: 'storage',
      userMessage: 'Storage is full. Please remove some contracts to free up space.',
      retryable: false,
      originalError: err,
    };
  }

  // API errors (objects with numeric status field)
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as Record<string, unknown>).status === 'number'
  ) {
    const status = (err as Record<string, unknown>).status as number;
    const isRetryable = status === 429;
    const userMessage =
      status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : status === 401
          ? 'Authentication failed. Please check your API key.'
          : `Server error (${status}). Please try again later.`;

    return {
      type: 'api',
      userMessage,
      retryable: isRetryable,
      originalError: err,
    };
  }

  // Unknown / fallback
  return {
    type: 'unknown',
    userMessage: 'An unexpected error occurred.',
    retryable: false,
    originalError: err,
  };
}

/**
 * Formats a ClassifiedError into a structured API error response object.
 */
export function formatApiError(classified: ClassifiedError, details?: unknown): ApiErrorResponse {
  return {
    error: classified.userMessage,
    type: classified.type,
    retryable: classified.retryable,
    ...(details !== undefined && { details }),
  };
}
