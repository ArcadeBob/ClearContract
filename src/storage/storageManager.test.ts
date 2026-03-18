import { describe, it, expect, beforeEach, vi } from 'vitest';
import { load, save, loadRaw, saveRaw, remove } from './storageManager';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('load', () => {
  it('returns ok:true with data:null for missing key', () => {
    const result = load('clearcontract:hide-resolved');
    expect(result).toEqual({ ok: true, data: null, error: null, quotaExceeded: false });
  });

  it('returns parsed JSON for valid stored data', () => {
    localStorage.setItem('clearcontract:hide-resolved', JSON.stringify('true'));
    const result = load('clearcontract:hide-resolved');
    expect(result.ok).toBe(true);
    expect(result.data).toEqual('true');
    expect(result.error).toBeNull();
    expect(result.quotaExceeded).toBe(false);
  });

  it('returns ok:false with error for invalid JSON', () => {
    localStorage.setItem('clearcontract:hide-resolved', 'not-json{');
    const result = load('clearcontract:hide-resolved');
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeTypeOf('string');
    expect(result.quotaExceeded).toBe(false);
  });
});

describe('save', () => {
  it('stores JSON-stringified value and returns ok:true', () => {
    const result = save('clearcontract:hide-resolved', 'true');
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.quotaExceeded).toBe(false);
    expect(localStorage.getItem('clearcontract:hide-resolved')).toBe('"true"');
  });

  it('returns ok:false with quotaExceeded:true on QuotaExceededError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    const result = save('clearcontract:hide-resolved', 'true');
    expect(result.ok).toBe(false);
    expect(result.quotaExceeded).toBe(true);
    expect(result.error).toBeTypeOf('string');
  });
});

describe('loadRaw', () => {
  it('returns ok:true with data:null for missing key', () => {
    const result = loadRaw('clearcontract:hide-resolved');
    expect(result).toEqual({ ok: true, data: null, error: null, quotaExceeded: false });
  });

  it('returns raw string for existing key', () => {
    localStorage.setItem('clearcontract:hide-resolved', 'true');
    const result = loadRaw('clearcontract:hide-resolved');
    expect(result.ok).toBe(true);
    expect(result.data).toBe('true');
  });
});

describe('saveRaw', () => {
  it('stores raw string and returns ok:true', () => {
    const result = saveRaw('clearcontract:hide-resolved', 'true');
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(localStorage.getItem('clearcontract:hide-resolved')).toBe('true');
  });

  it('returns ok:false with quotaExceeded:true on QuotaExceededError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    const result = saveRaw('clearcontract:hide-resolved', 'true');
    expect(result.ok).toBe(false);
    expect(result.quotaExceeded).toBe(true);
  });
});

describe('remove', () => {
  it('removes an existing key from localStorage', () => {
    localStorage.setItem('clearcontract:hide-resolved', 'true');
    remove('clearcontract:hide-resolved');
    expect(localStorage.getItem('clearcontract:hide-resolved')).toBeNull();
  });

  it('does not throw when removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('fail');
    });
    expect(() => remove('clearcontract:hide-resolved')).not.toThrow();
  });
});
