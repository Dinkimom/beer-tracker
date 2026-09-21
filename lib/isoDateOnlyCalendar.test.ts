import { describe, expect, it } from 'vitest';

import {
  formatIsoDateRuLongUtc,
  formatIsoDateRuNumericUtc,
  formatLocalDateToIsoDateOnly,
  parseIsoDateOnly,
} from '@/lib/isoDateOnlyCalendar';

describe('parseIsoDateOnly', () => {
  it('parses valid calendar date', () => {
    expect(parseIsoDateOnly('2026-05-14')).toEqual({ y: 2026, m: 5, d: 14 });
  });

  it('rejects invalid day for month', () => {
    expect(parseIsoDateOnly('2026-02-30')).toBeNull();
  });

  it('rejects garbage', () => {
    expect(parseIsoDateOnly('')).toBeNull();
    expect(parseIsoDateOnly('2026-5-05')).toBeNull();
  });
});

describe('formatIsoDateRuLongUtc', () => {
  it('formats in UTC Russian locale', () => {
    const s = formatIsoDateRuLongUtc('2026-05-14');
    expect(s).toMatch(/14/);
    expect(s).toMatch(/2026/);
  });
});

describe('formatIsoDateRuNumericUtc', () => {
  it('formats as DD.MM.YYYY', () => {
    expect(formatIsoDateRuNumericUtc('2026-05-06')).toBe('06.05.2026');
  });
});

describe('formatLocalDateToIsoDateOnly', () => {
  it('uses the local calendar date, not the UTC instant', () => {
    expect(formatLocalDateToIsoDateOnly(new Date(2025, 7, 31))).toBe('2025-08-31');
  });
});
