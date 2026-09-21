import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  QUARTERLY_PLANNED_SPRINT_BAR_GAP_PX,
  QUARTERLY_PLANNED_SPRINT_BAR_HEIGHT_PX,
  QUARTERLY_PLANNED_SPRINT_ROW_BOTTOM_PX,
  QUARTERLY_PLANNED_SPRINT_ROW_TOP_PX,
  QUARTERLY_TIMELINE_SUBROW_HEIGHT_PX,
} from '../quarterlyPlannerLayout';

import { measurePlannedInSprintContentHeight } from './QuarterlyPlannerPlannedInSprintTimeline';

function pos(id: string, start: number, duration: number): TaskPosition {
  return {
    taskId: 'STORY-1',
    sourceTaskId: id,
    assignee: 'dev',
    startDay: start,
    startPart: 0,
    duration,
  };
}

describe('measurePlannedInSprintContentHeight', () => {
  it('returns default subrow height when list is empty', () => {
    expect(measurePlannedInSprintContentHeight([])).toBe(QUARTERLY_TIMELINE_SUBROW_HEIGHT_PX);
  });

  it('grows with stack depth of overlapping bars', () => {
    const positions = [pos('a', 0, 8), pos('b', 1, 8), pos('c', 2, 8)];
    const stack = 3;
    const barsHeight =
      stack * QUARTERLY_PLANNED_SPRINT_BAR_HEIGHT_PX +
      (stack - 1) * QUARTERLY_PLANNED_SPRINT_BAR_GAP_PX;
    const expected =
      QUARTERLY_PLANNED_SPRINT_ROW_TOP_PX + barsHeight + QUARTERLY_PLANNED_SPRINT_ROW_BOTTOM_PX;
    expect(measurePlannedInSprintContentHeight(positions)).toBe(expected);
  });
});
