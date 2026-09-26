import { describe, expect, it } from 'vitest';

import { normalizeHolidayCountry } from './holidayCountries';
import {
  buildPublicHolidayDayCodes,
  calendarDayCount,
  isCompactDateRange,
  yearsInCompactRange,
} from './holidayDayCodes';

describe('calendar range', () => {
  it('counts inclusive calendar days', () => {
    expect(calendarDayCount('20260501', '20260504')).toBe(4);
    expect(isCompactDateRange('20260501', '20260504')).toBe(true);
  });

  it('rejects inverted, impossible, and too long ranges', () => {
    expect(calendarDayCount('20260504', '20260501')).toBeNull();
    expect(calendarDayCount('20230229', '20230301')).toBeNull();
    expect(calendarDayCount('20240101', '20250102')).toBeNull();
    expect(isCompactDateRange('2026-05-01', '20260504')).toBe(false);
  });

  it('lists each year the range touches', () => {
    expect(yearsInCompactRange('20261231', '20270101')).toEqual([2026, 2027]);
  });
});

describe('buildPublicHolidayDayCodes', () => {
  it('marks public holidays and weekends in isdayoff order', () => {
    const codes = buildPublicHolidayDayCodes(
      '20260501',
      '20260504',
      new Set(['2026-05-01'])
    );
    expect(codes).toBe('8110');
  });
});

describe('normalizeHolidayCountry', () => {
  it('keeps a known code and falls back to Russia', () => {
    expect(normalizeHolidayCountry('DE')).toBe('de');
    expect(normalizeHolidayCountry('xx')).toBe('ru');
    expect(normalizeHolidayCountry(null)).toBe('ru');
  });
});
