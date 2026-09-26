import { describe, expect, it } from 'vitest';

import {
  plannerNowLineLeftPercent,
  plannerNowWithinDay,
  timelineDayDividerClass,
  workdayProgress,
} from './timelineColumnChrome';

describe('timelineDayDividerClass', () => {
  it('omits the divider on the last day', () => {
    expect(timelineDayDividerClass(4, 5)).toBeNull();
  });

  it('uses the same grid color on every day, including a day off', () => {
    expect(timelineDayDividerClass(0, 5)).toBe(timelineDayDividerClass(2, 5));
    expect(timelineDayDividerClass(0, 5)).toContain('bg-gray-200');
    expect(timelineDayDividerClass(0, 5)).toContain('dark:bg-gray-600');
  });
});

describe('workdayProgress', () => {
  it('stays at the start before 9:00 and at the end after 18:00', () => {
    expect(workdayProgress(new Date(2026, 8, 28, 8, 30))).toBe(0);
    expect(workdayProgress(new Date(2026, 8, 28, 9, 0))).toBe(0);
    expect(workdayProgress(new Date(2026, 8, 28, 18, 0))).toBe(1);
    expect(workdayProgress(new Date(2026, 8, 28, 19, 15))).toBe(1);
  });

  it('is halfway through the workday at 13:30', () => {
    expect(workdayProgress(new Date(2026, 8, 28, 13, 30))).toBeCloseTo(0.5);
  });
});

describe('plannerNowWithinDay', () => {
  it('follows the clock on the same calendar day', () => {
    const day = new Date(2026, 8, 28);
    expect(plannerNowWithinDay(day, new Date(2026, 8, 28, 13, 30))).toBeCloseTo(0.5);
  });

  it('stays at the start when the column is not that calendar day', () => {
    const monday = new Date(2026, 8, 28);
    expect(plannerNowWithinDay(monday, new Date(2026, 8, 26, 15, 0))).toBe(0);
  });
});

describe('plannerNowLineLeftPercent', () => {
  it('offsets the line by the day and the progress inside it', () => {
    expect(plannerNowLineLeftPercent(1, 10, 0.5)).toBe(15);
  });
});
