import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import {
  fromWeekColumnPosition,
  QUARTERLY_DAYS_PER_WEEK,
  toWeekColumnPosition,
  weekCountFromColumnPosition,
} from './quarterlyWeekPositions';
import { storyPhaseToTaskPosition, taskPositionToStoryPhase } from './storyPhasePositions';

describe('quarterlyWeekPositions', () => {
  it('round-trips global position through week columns', () => {
    const global: TaskPosition = {
      taskId: 'NW-1:phase-1',
      startDay: 10,
      startPart: 0,
      duration: 2 * QUARTERLY_DAYS_PER_WEEK * PARTS_PER_DAY,
      assignee: '',
    };
    const week = toWeekColumnPosition(global);
    expect(week.startDay).toBe(2);
    expect(weekCountFromColumnPosition(week)).toBe(2);

    const back = fromWeekColumnPosition(week);
    expect(back.startDay).toBe(global.startDay);
    expect(back.duration).toBe(global.duration);
  });

  it('does not inflate duration on repeated fromWeekColumnPosition', () => {
    const week = toWeekColumnPosition({
      taskId: 'x',
      startDay: 5,
      startPart: 0,
      duration: 3 * QUARTERLY_DAYS_PER_WEEK * PARTS_PER_DAY,
      assignee: '',
    });
    const once = fromWeekColumnPosition(week);
    const twice = fromWeekColumnPosition(toWeekColumnPosition(once));
    expect(twice.duration).toBe(once.duration);
  });

  it('round-trips story phase via task position', () => {
    const phase = {
      id: 'p1',
      kind: 'delivery' as const,
      sprintIndex: 1,
      startDay: 0,
      durationDays: 10,
    };
    const global = storyPhaseToTaskPosition('NW-1', phase);
    const saved = taskPositionToStoryPhase(
      fromWeekColumnPosition(toWeekColumnPosition(global)),
      'delivery',
      'p1'
    );
    expect(saved.sprintIndex).toBe(phase.sprintIndex);
    expect(saved.startDay).toBe(phase.startDay);
    expect(saved.durationDays).toBe(phase.durationDays);
  });
});
