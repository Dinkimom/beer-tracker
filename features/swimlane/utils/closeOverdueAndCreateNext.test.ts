import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildNextPlanPosition } from './closeOverdueAndCreateNext';

function position(): TaskPosition {
  return { assignee: 'dev-1', duration: 6, startDay: 0, startPart: 0, taskId: 'OLD-1' };
}

describe('buildNextPlanPosition', () => {
  it('starts the new plan at the current cell for one day', () => {
    expect(buildNextPlanPosition(position(), 8, 3, 30, 'NEW-1')).toEqual({
      assignee: 'dev-1',
      duration: 3,
      startDay: 2,
      startPart: 2,
      taskId: 'NEW-1',
    });
  });

  it('clips the day when the sprint ends sooner', () => {
    expect(buildNextPlanPosition(position(), 29, 3, 30, 'NEW-1')?.duration).toBe(1);
  });

  it('returns null after the timeline', () => {
    expect(buildNextPlanPosition(position(), 30, 3, 30, 'NEW-1')).toBeNull();
  });
});
