import { describe, expect, it } from 'vitest';

import {
  buildSprintContextHolidayDays,
  holidayDayIndexSet,
  isoDateToCompact,
} from './sprintContextHolidays';

describe('isoDateToCompact', () => {
  it('converts ISO dates', () => {
    expect(isoDateToCompact('2026-10-28')).toBe('20261028');
    expect(isoDateToCompact('bad')).toBeNull();
  });
});

describe('buildSprintContextHolidayDays', () => {
  it('marks weekday holiday/non-working codes by calendar offset', () => {
    // Fri 2026-10-23 … Tue 2026-10-27 with weekend in between (codes length 5).
    const calendarDays = [
      { date: '2026-10-23', day: 0 },
      { date: '2026-10-26', day: 1 },
      { date: '2026-10-27', day: 2 },
    ];
    // offset 0=Fri, 1=Sat, 2=Sun, 3=Mon, 4=Tue — mark Mon (offset 3) as holiday.
    const codes = '00180';
    expect(buildSprintContextHolidayDays(calendarDays, codes)).toEqual([
      { date: '2026-10-26', day: 1 },
    ]);
  });

  it('treats code 1 on a weekday as non-working', () => {
    const calendarDays = [
      { date: '2026-10-28', day: 4 },
      { date: '2026-10-29', day: 5 },
    ];
    expect(buildSprintContextHolidayDays(calendarDays, '10')).toEqual([
      { date: '2026-10-28', day: 4 },
    ]);
  });
});

describe('holidayDayIndexSet', () => {
  it('collects day indices', () => {
    expect(holidayDayIndexSet([{ date: '2026-10-28', day: 4 }])).toEqual(new Set([4]));
    expect(holidayDayIndexSet(undefined).size).toBe(0);
  });
});
