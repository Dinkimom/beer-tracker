import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { getPartsPerDay } from '@/constants';

import {
  extendLastPlanSegmentToCell,
  formatOverdueDayAmount,
  isStrongOverdue,
  overdueDayAmount,
  resolveOverdueKind,
} from './overdueBaselineSummary';

function position(
  taskId: string,
  duration: number,
  segments?: TaskPosition['segments']
): TaskPosition {
  return {
    assignee: 'dev',
    duration,
    segments,
    startDay: 0,
    startPart: 0,
    taskId,
  };
}

describe('overdue day amount', () => {
  const parts = getPartsPerDay();

  it('rounds to one decimal and formats the separator', () => {
    expect(overdueDayAmount(parts, parts)).toBe(1);
    expect(overdueDayAmount(1, parts)).toBe(Math.round((1 / parts) * 10) / 10);
    expect(formatOverdueDayAmount(parts, parts, ',')).toBe('1');
    expect(formatOverdueDayAmount(3, 2, ',')).toBe('1,5');
    expect(formatOverdueDayAmount(3, 2, '.')).toBe('1.5');
  });

  it('treats two days and longer as a strong badge', () => {
    expect(isStrongOverdue(parts * 2, parts)).toBe(true);
    expect(isStrongOverdue(parts * 2 - 1, parts)).toBe(false);
  });
});

describe('resolveOverdueKind', () => {
  it('splits not started from work that is running long', () => {
    expect(resolveOverdueKind('todo')).toBe('notStarted');
    expect(resolveOverdueKind('in-progress')).toBe('slipping');
  });
});

describe('extendLastPlanSegmentToCell', () => {
  it('adds the gap to the last segment only', () => {
    const parts = getPartsPerDay();
    const next = extendLastPlanSegmentToCell(
      position('t1', 3, [
        { startDay: 0, startPart: 0, duration: 2 },
        { startDay: 1, startPart: 0, duration: 1 },
      ]),
      parts + 4
    );
    expect(next).toEqual([
      { startDay: 0, startPart: 0, duration: 2 },
      { startDay: 1, startPart: 0, duration: 4 },
    ]);
  });

  it('returns null when the plan already reaches now', () => {
    expect(extendLastPlanSegmentToCell(position('t1', 6), 4)).toBeNull();
  });
});
