import type { SprintContextPayload, SprintContextPosition } from '@/lib/sprints/sprintContextTypes';

import { describe, expect, it } from 'vitest';

import { pickNeighbourSprints, summarizeNeighbourSprint } from '@/lib/sprints/sprintContextNeighbours';

const sprint = (id: number, startDate: string) => ({
  endDate: startDate,
  id,
  name: `S${id}`,
  startDate,
  status: 'draft',
});

function position(taskId: string, extra: Partial<SprintContextPosition>): SprintContextPosition {
  return {
    assigneeId: 'u1',
    assigneeName: 'Ann',
    duration: 4,
    isQa: false,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    startDay: 0,
    startPart: 0,
    taskId,
    ...extra,
  };
}

const payload = (positions: SprintContextPosition[], unplannedTasks: SprintContextPayload['unplannedTasks'] = []) => ({
  meta: {
    legend: { day: '', note: '', part: '' },
    organizationId: 'o',
    partsPerDay: 2,
    schemaVersion: 2 as const,
    sprintId: 36,
    sprintWindow: { endDate: '2026-11-27', name: 'S36', startDate: '2026-11-16' },
  },
  positions,
  unplannedTasks,
});

describe('pickNeighbourSprints', () => {
  it('takes the sprints right before and after by start date', () => {
    const sprints = [sprint(37, '2026-11-30'), sprint(35, '2026-11-02'), sprint(36, '2026-11-16')];
    expect(pickNeighbourSprints(sprints, 36)).toEqual({ next: sprints[0], previous: sprints[1] });
    expect(pickNeighbourSprints(sprints, 35)).toEqual({ next: sprints[2], previous: undefined });
    expect(pickNeighbourSprints(sprints, 99)).toEqual({});
  });
});

describe('summarizeNeighbourSprint', () => {
  const positions = [
    position('T1', { schedule: { partsLeft: 3, state: 'in_window' }, startDay: 7 }),
    position('T2', { schedule: { partsLeft: 0, state: 'done' } }),
    position('T3', { inTrackerSprint: false, schedule: { partsLeft: 2, state: 'overdue' } }),
    position('T4', { assigneeId: 'u2', assigneeName: 'Bob', schedule: { notStartedForDays: 2, partsLeft: 0, state: 'overdue' } }),
  ];

  it('tail keeps unfinished work the tracker still holds and sums parts left by person', () => {
    const people = summarizeNeighbourSprint(
      payload(positions, [{ assigneeId: 'u2', statusCategory: 'todo', summary: 'no card', taskId: 'T5' }]),
      'tail'
    );
    expect(people).toEqual([
      {
        assigneeId: 'u1',
        assigneeName: 'Ann',
        parts: 3,
        tasks: [
          {
            done: false,
            onBoard: true,
            partsLeft: 3,
            plannedEnd: '2026-11-26',
            plannedStart: '2026-11-25',
            state: 'in_window',
            taskId: 'T1',
          },
        ],
      },
      {
        assigneeId: 'u2',
        assigneeName: 'Bob',
        parts: 0,
        tasks: [
          expect.objectContaining({ partsLeft: 0, state: 'overdue', taskId: 'T4' }),
          { done: false, onBoard: false, statusCategory: 'todo', summary: 'no card', taskId: 'T5' },
        ],
      },
    ]);
  });

  it('planned keeps everything in the sprint and sums card lengths', () => {
    const people = summarizeNeighbourSprint(payload(positions), 'planned');
    expect(people.map((person) => [person.assigneeId, person.parts, person.tasks.map((task) => task.taskId)])).toEqual([
      ['u1', 8, ['T1', 'T2']],
      ['u2', 4, ['T4']],
    ]);
  });
});
