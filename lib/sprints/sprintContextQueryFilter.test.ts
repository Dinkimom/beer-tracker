import type { SprintContextPayload } from './sprintContextTypes';

import { describe, expect, it } from 'vitest';

import { applySprintContextQueryFilters } from './sprintContextQueryFilter';

function payload(): SprintContextPayload {
  return {
    agenda: [],
    availability: [],
    featureLanes: null,
    meta: {
      calendarDays: [{ date: '2026-10-20', day: 0 }],
      legend: { day: 'd', note: 'n', part: 'p' },
      organizationId: 'org-1',
      partsPerDay: 2,
      schemaVersion: 2,
      sprintId: 1,
    },
    notes: [
      {
        assigneeId: 'staff:a',
        authorName: null,
        day: 0,
        id: 'n1',
        height: 1,
        kind: 'text',
        part: 0,
        text: 'sticky',
        width: 2,
      },
      {
        assigneeId: 'staff:b',
        authorName: null,
        day: 0,
        id: 'n2',
        height: 1,
        kind: 'text',
        part: 1,
        text: 'other',
        width: 2,
      },
    ],
    positions: [
      {
        assigneeId: 'staff:a',
        duration: 1,
        isQa: false,
        plannedDuration: null,
        plannedStartDay: null,
        plannedStartPart: null,
        startDay: 0,
        startPart: 0,
        taskId: 'T-1',
      },
      {
        assigneeId: 'staff:b',
        duration: 1,
        isQa: false,
        plannedDuration: null,
        plannedStartDay: null,
        plannedStartPart: null,
        startDay: 0,
        startPart: 1,
        taskId: 'T-2',
      },
    ],
    sprintGoals: { delivery: [], discovery: [] },
    taskLinks: [],
    unplannedTasks: [
      { assigneeId: 'staff:a', summary: 'backlog a', taskId: 'T-3' },
      { assigneeId: null, summary: 'unassigned', taskId: 'T-4' },
    ],
  };
}

describe('applySprintContextQueryFilters', () => {
  it('filters by assigneeId and rebuilds capacity', () => {
    const next = applySprintContextQueryFilters(payload(), { assigneeId: 'staff:a' });
    expect(next.positions.map((p) => p.taskId)).toEqual(['T-1']);
    expect(next.notes.map((n) => n.id)).toEqual(['n1']);
    expect(next.capacity?.people).toHaveLength(1);
    expect(next.capacity?.people[0]?.assigneeId).toBe('staff:a');
    expect(next.unplannedTasks?.map((t) => t.taskId)).toEqual(['T-3']);
  });

  it('filters by taskIds', () => {
    const next = applySprintContextQueryFilters(payload(), { taskIds: ['T-2'] });
    expect(next.positions.map((p) => p.taskId)).toEqual(['T-2']);
    expect(next.unplannedTasks).toEqual([]);
  });

  it('keeps unplanned tasks matching taskIds', () => {
    const next = applySprintContextQueryFilters(payload(), { taskIds: ['T-4'] });
    expect(next.positions).toEqual([]);
    expect(next.unplannedTasks?.map((t) => t.taskId)).toEqual(['T-4']);
  });
});
