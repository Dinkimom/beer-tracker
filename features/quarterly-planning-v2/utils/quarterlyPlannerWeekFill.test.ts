import type { StoryPhasePosition } from '../types';
import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { planWeekFillClass } from './quarterlyPlannerWeekFill';

describe('planWeekFillClass', () => {
  const delivery: StoryPhasePosition = {
    id: 'd1',
    kind: 'delivery',
    sprintIndex: 0,
    startDay: 0,
    durationDays: 5,
  };

  it('returns delivery fill when week is inside delivery phase', () => {
    const weekPos: TaskPosition = {
      taskId: 'S-1',
      assignee: '',
      startDay: 0,
      startPart: 0,
      duration: 5,
    };
    expect(planWeekFillClass(0, [{ phase: delivery, weekPos }])).toContain('blue');
  });

  it('returns null for empty week', () => {
    expect(planWeekFillClass(2, [])).toBeNull();
  });
});
