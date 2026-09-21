import { describe, expect, it, vi } from 'vitest';

import {
  formatDailyTabDayLabel,
  isDailyDayPickerNavigationKey,
  isSameCalendarDay,
  resolveDailyDayButtonClassName,
  resolveDailyDayAriaLabel,
  resolveDailyTabSprintDays,
  resolveDefaultDayIndex,
  resolveNextDayIndexFromKey,
} from './dailyTabHelpers';

describe('dailyTabHelpers', () => {
  it('resolveDailyTabSprintDays uses sprint start and end dates', () => {
    const days = resolveDailyTabSprintDays('2026-08-17', '2026-08-21');
    expect(days).toHaveLength(5);
    expect(days[0]?.getDate()).toBe(17);
    expect(days[4]?.getDate()).toBe(21);
  });

  it('resolveDefaultDayIndex returns today when sprint covers today', () => {
    const sprintDays = resolveDailyTabSprintDays('2026-08-18', '2026-08-29');
    const today = new Date(2026, 7, 20);
    vi.useFakeTimers();
    vi.setSystemTime(today);

    expect(resolveDefaultDayIndex(sprintDays)).toBe(2);

    vi.useRealTimers();
  });

  it('resolveDefaultDayIndex falls back to first or last sprint day', () => {
    const sprintDays = resolveDailyTabSprintDays('2026-08-18', '2026-08-29');

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 10));
    expect(resolveDefaultDayIndex(sprintDays)).toBe(0);

    vi.setSystemTime(new Date(2026, 8, 1));
    expect(resolveDefaultDayIndex(sprintDays)).toBe(sprintDays.length - 1);

    vi.useRealTimers();
  });

  it('formatDailyTabDayLabel uses locale weekday', () => {
    const date = new Date(2026, 7, 19);
    expect(formatDailyTabDayLabel(date, 'ru-RU')).toMatch(/19\.08/);
    expect(formatDailyTabDayLabel(date, 'en-US')).toMatch(/19\.08/);
  });

  it('isSameCalendarDay compares calendar parts only', () => {
    const left = new Date(2026, 7, 19, 9, 0, 0);
    const right = new Date(2026, 7, 19, 18, 30, 0);
    expect(isSameCalendarDay(left, right)).toBe(true);
    expect(isSameCalendarDay(left, new Date(2026, 7, 20))).toBe(false);
  });

  it('resolveNextDayIndexFromKey moves within sprint days', () => {
    expect(resolveNextDayIndexFromKey(2, 'ArrowLeft', 10)).toBe(1);
    expect(resolveNextDayIndexFromKey(2, 'ArrowRight', 10)).toBe(3);
    expect(resolveNextDayIndexFromKey(2, 'Home', 10)).toBe(0);
    expect(resolveNextDayIndexFromKey(2, 'End', 10)).toBe(9);
    expect(resolveNextDayIndexFromKey(0, 'ArrowLeft', 10)).toBe(0);
    expect(resolveNextDayIndexFromKey(9, 'ArrowRight', 10)).toBe(9);
  });

  it('isDailyDayPickerNavigationKey detects arrow and home/end keys', () => {
    expect(isDailyDayPickerNavigationKey('ArrowLeft')).toBe(true);
    expect(isDailyDayPickerNavigationKey('Enter')).toBe(false);
  });

  it('resolveDailyDayButtonClassName highlights active and today states', () => {
    expect(
      resolveDailyDayButtonClassName({ hasNote: false, isActive: true, isToday: false })
    ).toContain('bg-white');
    expect(
      resolveDailyDayButtonClassName({ hasNote: false, isActive: false, isToday: true })
    ).toContain('ring-blue-500');
    expect(
      resolveDailyDayButtonClassName({ hasNote: true, isActive: false, isToday: false })
    ).toContain('font-medium');
  });

  it('resolveDailyDayAriaLabel combines date, today and note flags', () => {
    const labels = {
      today: 'Today, Wed 19.08',
      todayWithNote: 'Wed 19.08, today, notes',
      withNote: 'Wed 19.08, notes',
    };
    expect(
      resolveDailyDayAriaLabel({
        dateLabel: 'Wed 19.08',
        hasNote: true,
        isToday: true,
        labels,
      })
    ).toBe('Wed 19.08, today, notes');
    expect(
      resolveDailyDayAriaLabel({
        dateLabel: 'Wed 19.08',
        hasNote: false,
        isToday: true,
        labels,
      })
    ).toBe('Today, Wed 19.08');
  });
});
