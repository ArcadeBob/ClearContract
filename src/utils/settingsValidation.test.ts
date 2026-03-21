import { describe, it, expect } from 'vitest';
import { validateField } from './settingsValidation';
import type { FieldType } from './settingsValidation';

describe('validateField', () => {
  // --- Empty string shortcut ---
  it('returns valid for empty string regardless of type', () => {
    const types: FieldType[] = ['dollar', 'date', 'employeeCount', 'text'];
    for (const t of types) {
      expect(validateField('', t)).toEqual({ valid: true });
    }
  });

  // --- Dollar validation ---
  describe('dollar', () => {
    it('accepts valid dollar amount and formats it', () => {
      const result = validateField('1000000', 'dollar');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('$1,000,000');
    });

    it('accepts dollar amount with $ and commas', () => {
      const result = validateField('$1,000,000', 'dollar');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('$1,000,000');
    });

    it('rejects non-numeric input', () => {
      const result = validateField('abc', 'dollar');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('accepts decimal dollar amounts', () => {
      const result = validateField('1500.50', 'dollar');
      expect(result.valid).toBe(true);
    });

    it('returns valid for dollar field with only whitespace/symbols stripped to empty', () => {
      const result = validateField('$', 'dollar');
      expect(result.valid).toBe(true);
    });
  });

  // --- Date validation ---
  describe('date', () => {
    it('accepts valid ISO date', () => {
      // Use a far-future date to avoid the "passed" warning
      const result = validateField('2099-01-01', 'date');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects invalid date string', () => {
      const result = validateField('not-a-date', 'date');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns warning for past date', () => {
      const result = validateField('2020-01-01', 'date');
      expect(result.valid).toBe(true);
      expect(result.warning).toBe('This date has passed');
    });

    it('accepts whitespace-only as valid (trimmed to empty)', () => {
      const result = validateField('   ', 'date');
      expect(result.valid).toBe(true);
    });
  });

  // --- Employee count validation ---
  describe('employeeCount', () => {
    it('accepts single number', () => {
      const result = validateField('25', 'employeeCount');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('25');
    });

    it('accepts range format', () => {
      const result = validateField('15-25', 'employeeCount');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('15-25');
    });

    it('normalizes spacing in range', () => {
      const result = validateField('15 - 25', 'employeeCount');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('15-25');
    });

    it('rejects non-numeric input', () => {
      const result = validateField('many', 'employeeCount');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects decimal numbers', () => {
      const result = validateField('15.5', 'employeeCount');
      expect(result.valid).toBe(false);
    });
  });

  // --- Text validation ---
  describe('text', () => {
    it('always returns valid for any text', () => {
      expect(validateField('anything goes here!', 'text')).toEqual({ valid: true });
    });
  });
});
