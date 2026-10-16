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
      legend: { day: 'd', part: 'p' },
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
        kind: 'text',
        part: 0,
        text: 'sticky',
      },
      {
        assigneeId: 'staff:b',
        authorName: null,
        day: 0,
        id: 'n2',
        kind: 'text',
        part: 1,
        text: 'other',
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
  };
}

describe('applySprintContextQueryFilters', () => {
  it('filters by assigneeId and rebuilds capacity', () => {
    const next = applySprintContextQueryFilters(payload(), { assigneeId: 'staff:a' });
    expect(next.positions.map((p) => p.taskId)).toEqual(['T-1']);
    expect(next.notes.map((n) => n.id)).toEqual(['n1']);
    expect(next.capacity?.people).toHaveLength(1);
    expect(next.capacity?.people[0]?.assigneeId).toBe('staff:a');
  });

  it('filters by taskIds', () => {
    const next = applySprintContextQueryFilters(payload(), { taskIds: ['T-2'] });
    expect(next.positions.map((p) => p.taskId)).toEqual(['T-2']);
  });
});
