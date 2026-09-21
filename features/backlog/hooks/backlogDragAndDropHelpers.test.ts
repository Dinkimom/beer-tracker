import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';

import { findTaskInSprints, getSprintTasksData } from './backlogDragAndDropHelpers';

function minimalSprint(id: number): SprintListItem {
  return {
    archived: false,
    board: { display: '', id: '', self: '' },
    createdAt: '',
    createdBy: {
      cloudUid: '',
      display: '',
      id: '',
      passportUid: 0,
      self: '',
    },
    endDate: '',
    endDateTime: '',
    id,
    name: `S${id}`,
    self: '',
    startDate: '',
    startDateTime: '',
    status: 'active',
    version: 1,
  } as SprintListItem;
}

describe('sprintTasksQueryKey', () => {
  it('единый ключ с useTasks и useReloadTasks', () => {
    expect(sprintTasksQueryKey(7, 3)).toEqual(['tasks', 7, 3]);
    expect(sprintTasksQueryKey(7, null)).toEqual(['tasks', 7, null]);
    expect(sprintTasksQueryKey(7, undefined)).toEqual(['tasks', 7, null]);
  });
});

describe('findTaskInSprints', () => {
  it('returns null when task is nowhere', () => {
    const qc = new QueryClient();
    expect(findTaskInSprints(qc, 'missing', [minimalSprint(1)], 1)).toBeNull();
  });

  it('finds task in first sprint that has it', () => {
    const qc = new QueryClient();
    const task = { id: 'abc' } as Task;
    qc.setQueryData(sprintTasksQueryKey(10, 5), {
      developers: [],
      sprintInfo: {},
      tasks: [task],
    });

    const result = findTaskInSprints(qc, 'abc', [minimalSprint(9), minimalSprint(10)], 5);
    expect(result).toEqual({ sourceSprintId: 10, task });
  });
});

describe('getSprintTasksData', () => {
  it('returns cached bundle', () => {
    const qc = new QueryClient();
    const bundle = { developers: [], sprintInfo: {}, tasks: [] as Task[] };
    qc.setQueryData(sprintTasksQueryKey(2, null), bundle);
    expect(getSprintTasksData(qc, 2, null)).toBe(bundle);
  });
});
