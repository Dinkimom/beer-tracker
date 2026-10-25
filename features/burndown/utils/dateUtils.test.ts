import { describe, expect, it } from 'vitest';

import {
  burndownLocalDateKey,
  countWorkingDays,
  holidayIndicesToDateKeys,
  isBurndownNonWorkingDay,
} from './dateUtils';

// Пн 2 ноября — пт 13 ноября 2026.
const start = new Date(2026, 10, 2);
const end = new Date(2026, 10, 13);

describe('burndown working days', () => {
  it('counts weekdays only without holidays', () => {
    expect(countWorkingDays(start, end)).toBe(10);
  });

  it('excludes organization holidays', () => {
    const holidays = new Set(['2026-11-04', '2026-11-05']);
    expect(countWorkingDays(start, end, holidays)).toBe(8);
    expect(isBurndownNonWorkingDay(new Date(2026, 10, 4), holidays)).toBe(true);
    expect(isBurndownNonWorkingDay(new Date(2026, 10, 3), holidays)).toBe(false);
    expect(isBurndownNonWorkingDay(new Date(2026, 10, 7))).toBe(true);
  });

  it('maps holiday indices of weekday columns to date keys', () => {
    // Индексы 2 и 5: ср 4 ноября и пн 9 ноября (выходные пропущены).
    expect([...holidayIndicesToDateKeys(start, 10, new Set([2, 5]))]).toEqual([
      '2026-11-04',
      '2026-11-09',
    ]);
    expect(holidayIndicesToDateKeys(null, 10, new Set([1])).size).toBe(0);
    expect(burndownLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
