import { describe, expect, it, vi } from 'vitest';

import {
  backlogBulkMoveFeedback,
  backlogTasksForBacklogMove,
  backlogTasksForSprintMove,
  locateBacklogSelections,
  planBacklogBulkDestination,
  runBacklogBulkMoves,
} from './backlogBulkMove';

describe('locateBacklogSelections', () => {
  const sprintTasks = new Map<number, { id: string }[]>([
    [1, [{ id: 'in-sprint' }]],
    [2, [{ id: 'other' }]],
  ]);

  it('prefers the sprint that currently holds the task', () => {
    const result = locateBacklogSelections(
      ['in-sprint', 'backlog-task', 'gone'],
      [{ id: 'backlog-task' }, { id: 'in-sprint' }],
      sprintTasks
    );
    expect(result.locations).toEqual([
      { sourceSprintId: 1, taskId: 'in-sprint' },
      { sourceSprintId: null, taskId: 'backlog-task' },
    ]);
    expect(result.missingIds).toEqual(['gone']);
  });
});

describe('backlog move plans', () => {
  const locations = [
    { sourceSprintId: 1, taskId: 'a' },
    { sourceSprintId: null, taskId: 'b' },
    { sourceSprintId: 2, taskId: 'c' },
  ];

  it('skips tasks that are already in the target sprint', () => {
    expect(backlogTasksForSprintMove(locations, 1).map((item) => item.taskId)).toEqual(['b', 'c']);
  });

  it('skips tasks that are already in the backlog', () => {
    expect(backlogTasksForBacklogMove(locations).map((item) => item.taskId)).toEqual(['a', 'c']);
  });

  it('drops tasks that are already in the destination from the move', () => {
    expect(planBacklogBulkDestination('sprint', locations, 1)).toEqual({
      items: [
        { sourceSprintId: null, taskId: 'b' },
        { sourceSprintId: 2, taskId: 'c' },
      ],
      skippedIds: ['a'],
    });
    expect(planBacklogBulkDestination('sprint', locations, undefined)).toBeNull();
  });
});

describe('backlogBulkMoveFeedback', () => {
  it('says the tasks are already there when nothing changes', () => {
    expect(backlogBulkMoveFeedback({ destination: 'sprint', failed: 0, moved: 0 })).toEqual({
      key: 'backlog.bulk.nothingToMove',
    });
  });

  it('reports a full sprint move and a partial failure', () => {
    expect(backlogBulkMoveFeedback({ destination: 'sprint', failed: 0, moved: 2 })).toEqual({
      key: 'backlog.bulk.movedToSprint',
      params: { count: 2 },
    });
    expect(backlogBulkMoveFeedback({ destination: 'backlog', failed: 1, moved: 2 })).toEqual({
      key: 'backlog.bulk.movePartial',
      params: { failed: 1, ok: 2 },
    });
  });
});

describe('runBacklogBulkMoves', () => {
  it('continues after a failure and returns the ids that moved', async () => {
    const move = vi.fn((item: { taskId: string }) => {
      if (item.taskId === 'bad') return Promise.reject(new Error('nope'));
      return Promise.resolve();
    });
    await expect(runBacklogBulkMoves([{ taskId: 'ok' }, { taskId: 'bad' }], move)).resolves.toEqual({
      failed: 1,
      movedIds: ['ok'],
    });
  });
});
