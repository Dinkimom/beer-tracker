import type { IssueTrackerIssueLink } from '@/lib/issueTrackerProvider/issueLinkTypes';

import { describe, expect, it } from 'vitest';

import { buildSprintContextDependencies, type DependencyTaskInfo } from '@/lib/sprints/sprintContextDependencies';

function link(linkedIssueKey: string, relationship: IssueTrackerIssueLink['relationship'], relationshipLabel?: string): IssueTrackerIssueLink {
  return { direction: 'outward', id: `${linkedIssueKey}-${relationship}`, linkedIssueKey, relationship, relationshipLabel };
}

const sprintTasks = new Map<string, DependencyTaskInfo>([
  ['B11', { done: false, plannedEnd: '2026-11-27', plannedStart: '2026-11-24', summary: 'B11' }],
  ['B12', { done: false, plannedEnd: '2026-11-25', plannedStart: '2026-11-23', summary: 'B12' }],
  ['F1', { done: false, summary: 'unplanned F1' }],
]);

describe('buildSprintContextDependencies', () => {
  it('shows what a task waits for outside the sprint and when it is planned to end', () => {
    const outside = new Map<string, DependencyTaskInfo>([
      [
        'B5b',
        {
          done: false,
          plannedEnd: '2026-11-24',
          plannedStart: '2026-11-20',
          sprint: { name: 'Sprint 36', sprintId: 1255 },
          statusCategory: 'in-progress',
        },
      ],
    ]);
    const result = buildSprintContextDependencies({
      boardArrows: [],
      outside,
      sprintId: 1256,
      sprintTasks,
      trackerLinks: { B11: [link('B5b', 'blocked_by')] },
    });
    expect(result.tasks).toEqual([
      {
        blocks: [],
        relates: [],
        taskId: 'B11',
        waitsFor: [
          {
            done: false,
            inThisSprint: false,
            plannedEnd: '2026-11-24',
            plannedStart: '2026-11-20',
            risk: 'ends_after_start',
            sprint: { name: 'Sprint 36', sprintId: 1255 },
            statusCategory: 'in-progress',
            taskId: 'B5b',
            via: ['tracker'],
          },
        ],
      },
    ]);
    expect(result.waitingOutside).toEqual([{ taskId: 'B11', waitsFor: ['B5b'] }]);
  });

  it('flags an unfinished dependency that is on no board', () => {
    const result = buildSprintContextDependencies({
      boardArrows: [],
      outside: new Map([['X1', { done: false }]]),
      sprintId: 1256,
      sprintTasks,
      trackerLinks: { B12: [link('X1', 'blocked_by')] },
    });
    expect(result.tasks[0]!.waitsFor[0]).toMatchObject({ risk: 'not_planned', taskId: 'X1' });
  });

  it('no risk when the dependency is done', () => {
    const result = buildSprintContextDependencies({
      boardArrows: [],
      outside: new Map([['X1', { done: true }]]),
      sprintId: 1256,
      sprintTasks,
      trackerLinks: { B12: [link('X1', 'blocked_by')] },
    });
    expect(result.tasks[0]!.waitsFor[0]!.risk).toBeUndefined();
    expect(result.waitingOutside).toEqual([]);
  });

  it('merges a board arrow and a tracker link between the same tasks', () => {
    const result = buildSprintContextDependencies({
      boardArrows: [{ fromAnchor: null, fromTaskId: 'B12', id: 'a1', toAnchor: null, toTaskId: 'B11' }],
      outside: new Map(),
      sprintId: 1256,
      sprintTasks,
      trackerLinks: { B11: [link('B12', 'blocked_by')], B12: [link('B11', 'blocks')] },
    });
    const b11 = result.tasks.find((task) => task.taskId === 'B11')!;
    const b12 = result.tasks.find((task) => task.taskId === 'B12')!;
    expect(b11.waitsFor).toHaveLength(1);
    expect(b11.waitsFor[0]).toMatchObject({ inThisSprint: true, taskId: 'B12', via: ['tracker', 'board'] });
    // B12 ends 25th, B11 starts 24th — B12 finishes after B11 starts.
    expect(b11.waitsFor[0]!.risk).toBe('ends_after_start');
    expect(b12.blocks[0]).toMatchObject({ risk: 'ends_after_start', taskId: 'B11' });
  });

  it('a task of the same sprint outside the filter is not outside the sprint', () => {
    const result = buildSprintContextDependencies({
      boardArrows: [],
      outside: new Map([['B5b', { done: false, sprint: { name: 'Sprint 37', sprintId: 1256 } }]]),
      sprintId: 1256,
      sprintTasks,
      trackerLinks: { B11: [link('B5b', 'blocked_by')] },
    });
    expect(result.tasks[0]!.waitsFor[0]).toMatchObject({ inThisSprint: true, taskId: 'B5b' });
    expect(result.tasks[0]!.waitsFor[0]!.sprint).toBeUndefined();
    expect(result.waitingOutside).toEqual([]);
  });

  it('no risk when the waiting side is already done', () => {
    const result = buildSprintContextDependencies({
      boardArrows: [],
      outside: new Map([['FE1', { done: true }]]),
      sprintId: 1256,
      sprintTasks,
      trackerLinks: { F1: [link('FE1', 'blocks')] },
    });
    expect(result.tasks[0]!.blocks[0]!.risk).toBeUndefined();
  });

  it('keeps relates and custom tracker phrases, drops duplicates', () => {
    const result = buildSprintContextDependencies({
      boardArrows: [],
      outside: new Map(),
      sprintId: 1256,
      sprintTasks,
      trackerLinks: {
        F1: [link('Y1', 'relates'), link('Y2', null, 'has to be done after'), link('Y3', 'duplicates')],
      },
    });
    expect(result.tasks[0]!.relates.map((target) => [target.taskId, target.label, target.done])).toEqual([
      ['Y1', undefined, null],
      ['Y2', 'has to be done after', null],
    ]);
  });
});
