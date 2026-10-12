import { describe, expect, it } from 'vitest';

import { customFieldDisplayMap, customFieldDisplayValue } from './customFieldDisplayValue';

describe('customFieldDisplayValue', () => {
  it('reads strings, numbers and named objects', () => {
    expect(customFieldDisplayValue(' Northwind ')).toBe('Northwind');
    expect(customFieldDisplayValue(8)).toBe('8');
    expect(customFieldDisplayValue({ display: 'Booking' })).toBe('Booking');
    expect(customFieldDisplayValue({ key: 'high' })).toBe('high');
    expect(customFieldDisplayValue({ id: '1', value: 'Yes' })).toBe('Yes');
  });

  it('joins arrays and skips empty values', () => {
    expect(customFieldDisplayValue([{ display: 'Ada' }, { name: 'Grace' }])).toBe('Ada, Grace');
    expect(customFieldDisplayValue('')).toBeNull();
    expect(customFieldDisplayValue({})).toBeNull();
    expect(customFieldDisplayValue(null)).toBeNull();
  });
});

describe('customFieldDisplayMap', () => {
  it('keeps only fields that have a display value', () => {
    expect(
      customFieldDisplayMap({
        customer: { display: 'Northwind' },
        empty: '',
        points: 3,
      })
    ).toEqual({
      customer: 'Northwind',
      points: '3',
    });
    expect(customFieldDisplayMap(undefined)).toBeUndefined();
  });
});
