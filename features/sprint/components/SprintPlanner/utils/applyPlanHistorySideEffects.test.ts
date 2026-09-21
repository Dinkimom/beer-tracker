import type { Comment, Task, TaskParent } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateIssueParent } from '@/lib/api/issues';

import {
  applyPlanHistoryCommentSlices,
  applyPlanHistoryTaskParents,
} from './applyPlanHistorySideEffects';

vi.mock('@/lib/api/issues', () => ({
  updateIssueParent: vi.fn().mockResolvedValue(true),
}));

const mockUpdateIssueParent = vi.mocked(updateIssueParent);

describe('applyPlanHistoryCommentSlices', () => {
  it('восстанавливает day/part/assignee заметки', () => {
    const comments: Comment[] = [
      {
        assigneeId: 'dev-1',
        day: 2,
        height: 1,
        id: 'c1',
        part: 1,
        text: 'note',
        width: 2,
        x: 0,
        y: 0,
      },
    ];
    applyPlanHistoryCommentSlices(
      new Map([
        [
          'c1',
          {
            assigneeId: 'dev-2',
            day: 0,
            height: 1,
            part: 0,
            width: 3,
            x: 0,
            y: 0,
          },
        ],
      ]),
      (updater) => {
        const next = typeof updater === 'function' ? updater(comments) : updater;
        comments.splice(0, comments.length, ...next);
      }
    );
    expect(comments[0]).toMatchObject({
      assigneeId: 'dev-2',
      day: 0,
      part: 0,
      width: 3,
    });
  });
});

describe('applyPlanHistoryTaskParents', () => {
  beforeEach(() => {
    mockUpdateIssueParent.mockClear();
  });

  it('ставит локального родителя и ходит в трекер для ключа стори', () => {
    const parent: TaskParent = { display: 'Story', id: 'st', key: 'ST-9' };
    let tasks: Task[] = [{ id: 'T-1', name: 'Task' } as Task];
    const setFeatureLanes = vi.fn((updater: (prev: undefined) => unknown) => updater(undefined));

    applyPlanHistoryTaskParents({
      selectedSprintId: 1,
      setFeatureLanes,
      setTasks: (updater) => {
        tasks = typeof updater === 'function' ? updater(tasks) : updater;
      },
      taskParents: new Map([['T-1', parent]]),
    });

    expect(tasks[0]?.parent).toEqual(parent);
    expect(mockUpdateIssueParent).toHaveBeenCalledWith('T-1', 'ST-9', 1);
  });
});
