import { describe, it, expect } from 'vitest';
import { mapRow, mapRows, mapToSnake } from '../mappers';

describe('mapRow', () => {
  it('converts snake_case keys to camelCase', () => {
    const row = { first_name: 'Alice', last_name: 'Smith' };
    const result = mapRow<{ firstName: string; lastName: string }>(row);
    expect(result).toEqual({ firstName: 'Alice', lastName: 'Smith' });
  });

  it('converts null values to undefined', () => {
    const row = { some_field: null };
    const result = mapRow<{ someField: undefined }>(row);
    expect(result.someField).toBeUndefined();
  });

  it('passes through non-null values unchanged', () => {
    const row = { count: 42, active: true };
    const result = mapRow<{ count: number; active: boolean }>(row);
    expect(result).toEqual({ count: 42, active: true });
  });
});

describe('mapRows', () => {
  it('maps an array of rows', () => {
    const rows = [
      { user_name: 'a' },
      { user_name: 'b' },
    ];
    const result = mapRows<{ userName: string }>(rows);
    expect(result).toEqual([{ userName: 'a' }, { userName: 'b' }]);
  });
});

describe('mapToSnake', () => {
  it('converts glPerOccurrence to gl_per_occurrence', () => {
    expect(mapToSnake({ glPerOccurrence: '$1M' })).toEqual({ gl_per_occurrence: '$1M' });
  });

  it('converts wcStatutoryState to wc_statutory_state', () => {
    expect(mapToSnake({ wcStatutoryState: 'CA' })).toEqual({ wc_statutory_state: 'CA' });
  });

  it('converts sbeCertId to sbe_cert_id', () => {
    expect(mapToSnake({ sbeCertId: '123' })).toEqual({ sbe_cert_id: '123' });
  });

  it('converts lausdVendorNumber to lausd_vendor_number', () => {
    expect(mapToSnake({ lausdVendorNumber: '456' })).toEqual({ lausd_vendor_number: '456' });
  });

  it('returns empty object for empty input', () => {
    expect(mapToSnake({})).toEqual({});
  });

  it('preserves values without transformation', () => {
    const input = {
      glPerOccurrence: '$1,000,000',
      bondingSingleProject: '$500,000',
      employeeCount: '15-25',
    };
    const result = mapToSnake(input);
    expect(result.gl_per_occurrence).toBe('$1,000,000');
    expect(result.bonding_single_project).toBe('$500,000');
    expect(result.employee_count).toBe('15-25');
  });
});
