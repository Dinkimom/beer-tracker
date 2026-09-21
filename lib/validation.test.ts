import { describe, expect, it } from 'vitest';

import { MAX_PLANNER_DAY_INDEX, MAX_PLANNER_DURATION_PARTS } from '@/constants';
import { TaskPositionSchema, validateRequest } from '@/lib/validation';

describe('TaskPositionSchema', () => {
  const base = {
    assigneeId: 'user-1',
    duration: 3,
    startDay: 0,
    startPart: 0,
    taskId: 'RND-1',
  };

  it('accepts day indices beyond the legacy 10-day sprint (0–9)', () => {
    const result = validateRequest(TaskPositionSchema, {
      ...base,
      plannedStartDay: 14,
      startDay: 14,
    });
    expect(result.success).toBe(true);
  });

  it('accepts max planner day index and duration parts', () => {
    const result = validateRequest(TaskPositionSchema, {
      ...base,
      duration: MAX_PLANNER_DURATION_PARTS,
      plannedDuration: MAX_PLANNER_DURATION_PARTS,
      plannedStartDay: MAX_PLANNER_DAY_INDEX,
      startDay: MAX_PLANNER_DAY_INDEX,
    });
    expect(result.success).toBe(true);
  });

  it('rejects day index above MAX_PLANNER_DAY_INDEX', () => {
    const result = validateRequest(TaskPositionSchema, {
      ...base,
      startDay: MAX_PLANNER_DAY_INDEX + 1,
    });
    expect(result.success).toBe(false);
  });
});
