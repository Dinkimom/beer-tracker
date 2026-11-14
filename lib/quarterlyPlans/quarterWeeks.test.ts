import { describe, expect, it } from 'vitest';

import {
  buildQuarterWeeks,
  groupWeeksByMonth,
  quarterOfDate,
  resolveWeekSpan,
  shiftQuarter,
  weekIndexOfDate,
} from './quarterWeeks';

describe('buildQuarterWeeks', () => {
  it('Q4 2026: 14 недель с 28.09 по 31.12, как в роадмэпе', () => {
    const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });
    expect(weeks).toHaveLength(14);
    expect(weeks[0]).toMatchObject({ endDate: '2026-10-02', month: 9, startDate: '2026-09-28' });
    expect(weeks[13]).toMatchObject({ endDate: '2027-01-01', startDate: '2026-12-28' });
  });

  it('соседние кварталы не делят неделю и не теряют её', () => {
    const q3 = buildQuarterWeeks({ quarter: 3, year: 2026 });
    const q4 = buildQuarterWeeks({ quarter: 4, year: 2026 });
    expect(q3[q3.length - 1]!.startDate).toBe('2026-09-21');
    expect(q4[0]!.startDate).toBe('2026-09-28');
  });

  it('год целиком — 52 или 53 недели', () => {
    const total = ([1, 2, 3, 4] as const)
      .map((quarter) => buildQuarterWeeks({ quarter, year: 2026 }).length)
      .reduce((sum, count) => sum + count, 0);
    expect(total).toBe(53);
  });
});

describe('quarterOfDate / shiftQuarter', () => {
  it('неделя 28.09–02.10 относится к Q4', () => {
    expect(quarterOfDate(new Date(2026, 8, 29, 12))).toEqual({ quarter: 4, year: 2026 });
  });

  it('переходит через границу года в обе стороны', () => {
    expect(shiftQuarter({ quarter: 4, year: 2026 }, 1)).toEqual({ quarter: 1, year: 2027 });
    expect(shiftQuarter({ quarter: 1, year: 2026 }, -1)).toEqual({ quarter: 4, year: 2025 });
  });
});

describe('resolveWeekSpan / weekIndexOfDate / groupWeeksByMonth', () => {
  const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });

  it('двухнедельный спринт занимает две колонки', () => {
    expect(resolveWeekSpan(weeks, '2026-10-12', '2026-10-23')).toEqual({ startWeek: 2, weeks: 2 });
  });

  it('период из выходных и период вне квартала не попадают в сетку', () => {
    expect(resolveWeekSpan(weeks, '2026-10-10', '2026-10-11')).toBeNull();
    expect(resolveWeekSpan(weeks, '2026-07-01', '2026-07-10')).toBeNull();
  });

  it('находит неделю по дате, включая выходные', () => {
    expect(weekIndexOfDate(weeks, new Date(2026, 9, 16, 12))).toBe(2);
    expect(weekIndexOfDate(weeks, new Date(2026, 9, 18, 12))).toBe(2);
    expect(weekIndexOfDate(weeks, new Date(2026, 5, 1, 12))).toBe(-1);
  });

  it('группирует недели по месяцам: 5 + 4 + 5', () => {
    expect(groupWeeksByMonth(weeks)).toEqual([
      { month: 9, startWeek: 0, weeks: 5 },
      { month: 10, startWeek: 5, weeks: 4 },
      { month: 11, startWeek: 9, weeks: 5 },
    ]);
  });
});
