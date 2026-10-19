import { describe, expect, it } from 'vitest';

import { simulatePositionsAfterPatch } from './sprintPlanPatchHelpers';
import {
  buildSprintPlanPatchPositionChanges,
  formatSprintPlanPatchPositionChangeLines,
  labelSprintPlanPatchPositionChanges,
} from './sprintPlanPatchPositionChanges';

const current = [
  {
    assigneeId: 'staff:a',
    duration: 2,
    isQa: false,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    startDay: 0,
    startPart: 0,
    taskId: 'RND-1',
  },
];

describe('buildSprintPlanPatchPositionChanges', () => {
  it('returns before/after for move and delete', () => {
    const ops = [
      {
        assigneeId: 'staff:b',
        duration: 4,
        op: 'upsertPosition' as const,
        startDay: 2,
        startPart: 1,
        taskId: 'RND-1',
      },
      { op: 'deletePosition' as const, taskId: 'RND-2' },
    ];
    const withDeleteTarget = [
      ...current,
      {
        assigneeId: 'staff:a',
        duration: 1,
        isQa: false,
        plannedDuration: null,
        plannedStartDay: null,
        plannedStartPart: null,
        startDay: 1,
        startPart: 0,
        taskId: 'RND-2',
      },
    ];
    const simulated = simulatePositionsAfterPatch(withDeleteTarget, ops);
    const changes = buildSprintPlanPatchPositionChanges({
      current: withDeleteTarget,
      ops,
      simulated,
    });
    expect(changes).toEqual([
      {
        after: {
          assigneeId: 'staff:b',
          duration: 4,
          startDay: 2,
          startPart: 1,
        },
        before: {
          assigneeId: 'staff:a',
          duration: 2,
          startDay: 0,
          startPart: 0,
        },
        changes: ['schedule', 'duration'],
        kind: 'update',
        taskId: 'RND-1',
      },
      {
        after: null,
        before: {
          assigneeId: 'staff:a',
          duration: 1,
          startDay: 1,
          startPart: 0,
        },
        changes: [],
        kind: 'remove',
        taskId: 'RND-2',
      },
    ]);
    expect(formatSprintPlanPatchPositionChangeLines(changes)).toEqual([
      'RND-1: staff:a day 0 part 0 dur 2 → staff:b day 2 part 1 dur 4',
      'RND-2: staff:a day 1 part 0 dur 1 → (removed)',
    ]);
    const labeled = labelSprintPlanPatchPositionChanges({
      calendarDays: [
        { date: '2026-10-19', day: 0 },
        { date: '2026-10-20', day: 1 },
        { date: '2026-10-21', day: 2 },
      ],
      changes,
      current: withDeleteTarget.map((position) =>
        position.taskId === 'RND-1' ? { ...position, assigneeName: 'Nikita' } : position
      ),
      partsPerDay: 2,
      simulated,
    });
    expect(labeled[0]?.beforeSchedule).toContain('2026-10-19');
    expect(labeled[0]?.beforeSchedule).toContain('Nikita');
    expect(labeled[0]?.afterSchedule).toContain('2026-10-21');
    expect(labeled[1]?.beforeSchedule).toContain('2026-10-20');
    expect(labeled[1]?.afterSchedule).toBeNull();
  });
});
