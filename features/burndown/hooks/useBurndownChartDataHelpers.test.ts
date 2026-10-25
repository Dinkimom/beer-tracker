import { describe, expect, it } from 'vitest';

import {
  calculateBurndownIdealValues,
  formatBurndownChartDateLabel,
  resolveBurndownTodayAxisLabel,
} from './useBurndownChartDataHelpers';

describe('resolveBurndownTodayAxisLabel', () => {
  const today = new Date(2026, 9, 4);
  const todayLabel = formatBurndownChartDateLabel(today);

  it('returns the axis label when today is on the chart', () => {
    expect(resolveBurndownTodayAxisLabel(['23.09', todayLabel, '03.10'], today)).toBe(todayLabel);
  });

  it('returns null when today is outside the series', () => {
    expect(resolveBurndownTodayAxisLabel(['23.09', '03.10'], today)).toBeNull();
  });
});

describe('calculateBurndownIdealValues', () => {
  // Пн 2 ноября — пт 13 ноября 2026: 10 рабочих дней, ср 4 ноября — праздник.
  const start = new Date(2026, 10, 2);
  const holidays = new Set(['2026-11-04']);
  const state = { lastWorkingDayIdealSP: 90, lastWorkingDayIdealTP: 45 };

  it('without holidays spreads scope over all weekdays', () => {
    const tue = calculateBurndownIdealValues(new Date(2026, 10, 3), 100, 50, start, 10, state);
    expect(tue.idealSP).toBeCloseTo(80, 6);
  });

  it('holds the ideal line flat on an organization holiday', () => {
    const tue = calculateBurndownIdealValues(new Date(2026, 10, 3), 90, 45, start, 9, state, holidays);
    const wed = calculateBurndownIdealValues(
      new Date(2026, 10, 4),
      90,
      45,
      start,
      9,
      tue.nextState,
      holidays
    );
    expect(wed.idealSP).toBe(tue.idealSP);
    expect(wed.idealTP).toBe(tue.idealTP);
  });

  it('does not count the holiday as a passed working day', () => {
    const thu = calculateBurndownIdealValues(new Date(2026, 10, 5), 90, 45, start, 9, state, holidays);
    // Пн, вт, чт = 3 из 9 рабочих дней.
    expect(thu.idealSP).toBeCloseTo(60, 6);
    expect(thu.idealTP).toBeCloseTo(30, 6);
  });

  it('reaches zero on the last working day', () => {
    const fri = calculateBurndownIdealValues(new Date(2026, 10, 13), 90, 45, start, 9, state, holidays);
    expect(fri.idealSP).toBe(0);
  });
});
