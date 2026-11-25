import { describe, expect, it } from 'vitest';

import { buildSprintContextCalendarDays } from '@/lib/sprints/sprintContextEnrichmentHelpers';
import { buildPositionSchedule, buildSprintContextToday } from '@/lib/sprints/sprintContextToday';

// Пн 2026-11-16 … Пт 2026-11-27: дни 0..9, выходные 21–22.
const calendarDays = buildSprintContextCalendarDays('2026-11-16', '2026-11-27');

function schedule(
  todayIso: string,
  position: { duration: number; segments?: Array<{ duration: number; startDay: number; startPart: number }>; startDay: number; startPart?: number },
  flags: { completed?: boolean; notStarted?: boolean } = {}
) {
  const today = buildSprintContextToday(calendarDays, todayIso)!;
  return buildPositionSchedule({
    completed: flags.completed ?? false,
    notStarted: flags.notStarted ?? false,
    partsPerDay: 3,
    position: { startPart: 0, ...position },
    today,
  });
}

describe('buildSprintContextToday', () => {
  it('maps a working day to its index', () => {
    expect(buildSprintContextToday(calendarDays, '2026-11-18')).toMatchObject({
      day: 2,
      pivotDay: 2,
      relation: 'in_sprint',
    });
  });

  it('has no index on a weekend, pivot is the next Monday', () => {
    expect(buildSprintContextToday(calendarDays, '2026-11-21')).toMatchObject({
      day: null,
      pivotDay: 5,
      relation: 'in_sprint',
    });
  });

  it('knows when today is outside the sprint', () => {
    expect(buildSprintContextToday(calendarDays, '2026-11-10')).toMatchObject({
      day: null,
      pivotDay: 0,
      relation: 'before_sprint',
    });
    expect(buildSprintContextToday(calendarDays, '2026-12-01')).toMatchObject({
      day: null,
      pivotDay: 10,
      relation: 'after_sprint',
    });
  });

  it('is null without sprint dates', () => {
    expect(buildSprintContextToday([], '2026-11-18')).toBeNull();
  });
});

describe('buildPositionSchedule', () => {
  it('scheduled when the window is ahead', () => {
    expect(schedule('2026-11-18', { duration: 3, startDay: 4 })).toEqual({
      partsLeft: 3,
      state: 'scheduled',
    });
  });

  it('due_today when the window starts today', () => {
    expect(schedule('2026-11-18', { duration: 6, startDay: 2 })).toEqual({
      partsLeft: 6,
      state: 'due_today',
    });
  });

  it('counts days not started, in the window and after it ended', () => {
    expect(schedule('2026-11-19', { duration: 9, startDay: 0 }, { notStarted: true })).toEqual({
      notStartedForDays: 3,
      partsLeft: 0,
      state: 'overdue',
    });
    expect(schedule('2026-11-18', { duration: 9, startDay: 0 }, { notStarted: true })).toEqual({
      notStartedForDays: 2,
      partsLeft: 3,
      state: 'in_window',
    });
  });

  it('overdue when the window has ended and the task is not done', () => {
    expect(schedule('2026-11-20', { duration: 3, startDay: 1 })).toEqual({
      partsLeft: 0,
      state: 'overdue',
    });
  });

  it('done regardless of the window', () => {
    expect(schedule('2026-11-20', { duration: 3, startDay: 1 }, { completed: true })).toEqual({
      partsLeft: 0,
      state: 'done',
    });
  });

  it('counts only the remaining parts of split segments', () => {
    expect(
      schedule('2026-11-19', {
        duration: 6,
        segments: [
          { duration: 3, startDay: 0, startPart: 0 },
          { duration: 3, startDay: 3, startPart: 1 },
        ],
        startDay: 0,
      })
    ).toEqual({ partsLeft: 3, state: 'in_window' });
  });

  it('a Monday task on a weekend is scheduled, not due today', () => {
    expect(schedule('2026-11-22', { duration: 3, startDay: 5 })).toEqual({
      partsLeft: 3,
      state: 'scheduled',
    });
  });

  it('everything not done is overdue after the sprint', () => {
    expect(schedule('2026-12-01', { duration: 3, startDay: 9 })).toEqual({
      partsLeft: 0,
      state: 'overdue',
    });
  });
});
