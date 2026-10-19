import { describe, expect, it } from 'vitest';

import {
  collectPositionPatchTaskIds,
  collectUpsertPositionTaskIds,
  formatSprintPlanSchedule,
} from './sprintPlanScheduleFormat';

describe('formatSprintPlanSchedule', () => {
  it('formats start–end with partsPerDay and calendar dates', () => {
    const lines = formatSprintPlanSchedule(
      [
        {
          assigneeId: 'staff:a',
          assigneeName: 'Nikita Dmitriev',
          duration: 4,
          isQa: false,
          plannedDuration: null,
          plannedStartDay: null,
          plannedStartPart: null,
          startDay: 0,
          startPart: 0,
          taskId: 'RND-1441',
        },
      ],
      [
        { date: '2026-10-20', day: 0 },
        { date: '2026-10-21', day: 1 },
      ],
      2
    );
    expect(lines).toEqual([
      'RND-1441  Nikita Dmitriev  2026-10-20 (1/2) – 2026-10-21 (2/2)  2d',
    ]);
  });
});

describe('collectUpsertPositionTaskIds', () => {
  it('collects upsertPosition task ids', () => {
    expect(
      collectUpsertPositionTaskIds([
        { op: 'upsertPosition', taskId: 'A-1' },
        { op: 'deletePosition', taskId: 'A-2' },
        { op: 'createNote' },
      ])
    ).toEqual(new Set(['A-1']));
  });
});

describe('collectPositionPatchTaskIds', () => {
  it('collects upsertPosition and deletePosition task ids', () => {
    expect(
      collectPositionPatchTaskIds([
        { op: 'upsertPosition', taskId: 'A-1' },
        { op: 'deletePosition', taskId: 'A-2' },
        { op: 'createNote' },
      ])
    ).toEqual(new Set(['A-1', 'A-2']));
  });
});
