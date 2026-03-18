/**
 * Typed localStorage wrapper with registry.
 * Pure utility -- no React imports.
 */

/**
 * Maps all localStorage keys to their stored value types.
 */
export interface StorageRegistry {
  'clearcontract:hide-resolved': string;
}

export type StorageKey = keyof StorageRegistry;

export interface StorageResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  quotaExceeded: boolean;
}

/**
 * Reads a JSON-parsed value from localStorage.
 * For keys that store plain strings, use `loadRaw` instead.
 */
export function load<K extends StorageKey>(key: K): StorageResult<StorageRegistry[K]> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { ok: true, data: null, error: null, quotaExceeded: false };
    }
    const parsed = JSON.parse(raw) as StorageRegistry[K];
    return { ok: true, data: parsed, error: null, quotaExceeded: false };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load from storage',
      quotaExceeded: false,
    };
  }
}

/**
 * Writes a JSON-stringified value to localStorage.
 * For keys that store plain strings, use `saveRaw` instead.
 */
export function save<K extends StorageKey>(
  key: K,
  value: StorageRegistry[K],
): StorageResult<null> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, data: null, error: null, quotaExceeded: false };
  } catch (e) {
    const isQuota =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return {
      ok: false,
      data: null,
      error: e instanceof Error ? e.message : 'Failed to save to storage',
      quotaExceeded: isQuota,
    };
  }
}

/**
 * Reads a raw string value from localStorage without JSON.parse.
 * Use for keys that store plain strings (hide-resolved).
 */
export function loadRaw<K extends StorageKey>(key: K): StorageResult<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { ok: true, data: null, error: null, quotaExceeded: false };
    }
    return { ok: true, data: raw, error: null, quotaExceeded: false };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load from storage',
      quotaExceeded: false,
    };
  }
}

/**
 * Writes a raw string value to localStorage without JSON.stringify.
 * Use for keys that store plain strings (hide-resolved).
 */
export function saveRaw<K extends StorageKey>(key: K, value: string): StorageResult<null> {
  try {
    localStorage.setItem(key, value);
    return { ok: true, data: null, error: null, quotaExceeded: false };
  } catch (e) {
    const isQuota =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return {
      ok: false,
      data: null,
      error: e instanceof Error ? e.message : 'Failed to save to storage',
      quotaExceeded: isQuota,
    };
  }
}

/**
 * Removes a key from localStorage. Errors are silently swallowed.
 */
export function remove<K extends StorageKey>(key: K): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Swallow errors — removal is best-effort
  }
}
