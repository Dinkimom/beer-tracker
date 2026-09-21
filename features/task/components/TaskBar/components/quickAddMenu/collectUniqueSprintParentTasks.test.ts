import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  collectQuickAddExcludedIssueKeys,
  collectUniqueSprintParentTasks,
  mergeQuickAddParentTasks,
} from './collectUniqueSprintParentTasks';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'name'>): Task {
  return {
    link: '#',
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

describe('collectUniqueSprintParentTasks', () => {
  it('returns unique parents from parent and epic fields', () => {
    const parents = collectUniqueSprintParentTasks([
      task({
        id: 'T-1',
        name: 'A',
        parent: { display: 'Story One', id: '1', key: 'ST-1' },
      }),
      task({
        id: 'T-2',
        name: 'B',
        parent: { display: 'Story One', id: '1', key: 'ST-1' },
      }),
      task({
        id: 'T-3',
        name: 'C',
        epic: { display: 'Epic Two', id: '2', key: 'EP-2' },
      }),
      task({ id: 'T-4', name: 'D' }),
    ]);

    expect(parents).toEqual([
      { display: 'Epic Two', id: '2', key: 'EP-2' },
      { display: 'Story One', id: '1', key: 'ST-1' },
    ]);
  });

  it('prefers parent over epic on the same task', () => {
    const parents = collectUniqueSprintParentTasks([
      task({
        id: 'T-1',
        name: 'A',
        epic: { display: 'Epic', id: 'e', key: 'EP-1' },
        parent: { display: 'Story', id: 's', key: 'ST-1' },
      }),
    ]);

    expect(parents).toEqual([{ display: 'Story', id: 's', key: 'ST-1' }]);
  });

  it('skips local draft tasks', () => {
    const parents = collectUniqueSprintParentTasks([
      task({
        id: 'local-1',
        isLocalTask: true,
        name: 'Draft',
        parent: { display: 'Story', id: 's', key: 'ST-1' },
      }),
    ]);

    expect(parents).toEqual([]);
  });

  it('coerces numeric parent and epic ids from Jira payloads', () => {
    const parents = collectUniqueSprintParentTasks([
      task({
        epic: { display: 'Epic Two', id: 55 as never, key: 'EP-2' },
        id: 'T-1',
        name: 'A',
      }),
      task({
        id: 'T-2',
        name: 'B',
        parent: { display: 'Story One', id: 10010 as never, key: 'ST-1' },
      }),
    ]);

    expect(parents).toEqual([
      { display: 'Epic Two', id: '55', key: 'EP-2' },
      { display: 'Story One', id: '10010', key: 'ST-1' },
    ]);
  });

  it('includes feature-draft parents by display name so they can be linked', () => {
    const parents = collectUniqueSprintParentTasks([
      task({
        id: 'comment:note-1',
        name: 'Note',
        parent: { display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' },
      }),
      task({
        id: 'T-1',
        name: 'A',
        parent: { display: 'Story One', id: '1', key: 'ST-1' },
      }),
    ]);

    expect(parents).toEqual(
      expect.arrayContaining([
        { display: 'Story One', id: '1', key: 'ST-1' },
        { display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' },
      ])
    );
    expect(parents).toHaveLength(2);
  });

  it('skips feature-draft parents that only have the raw row id', () => {
    expect(
      collectUniqueSprintParentTasks([
        task({
          id: 'comment:note-1',
          name: 'Note',
          parent: {
            display: 'feature-draft:1',
            id: 'feature-draft:1',
            key: 'feature-draft:1',
          },
        }),
      ])
    ).toEqual([]);
  });
});

describe('mergeQuickAddParentTasks', () => {
  it('replaces a raw feature-draft display with the draft row name', () => {
    expect(
      mergeQuickAddParentTasks(
        [
          {
            display: 'feature-draft:1',
            id: 'feature-draft:1',
            key: 'feature-draft:1',
          },
        ],
        [{ id: 'feature-draft:1', name: 'Пупи' }]
      )
    ).toEqual([{ display: 'Пупи', id: 'feature-draft:1', key: 'feature-draft:1' }]);
  });
});

describe('collectQuickAddExcludedIssueKeys', () => {
  it('excludes sprint tasks that already have a board position', () => {
    const excluded = collectQuickAddExcludedIssueKeys(
      [
        task({ id: 'T-1', name: 'On board' }),
        task({ id: 'T-2', name: 'Not placed' }),
        task({ id: 'local-task-1', isLocalTask: true, name: 'Draft' }),
      ],
      new Map([
        ['T-1', { assignee: 'dev', duration: 1, startDay: 0, startPart: 0, taskId: 'T-1' }],
        ['local-task-1', { assignee: 'dev', duration: 1, startDay: 0, startPart: 0, taskId: 'local-task-1' }],
      ])
    );

    expect([...excluded]).toEqual(['T-1']);
  });
});
