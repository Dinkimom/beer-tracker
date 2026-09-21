import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { filterTasksNotOnSwimlane } from './filterTasksNotOnSwimlane';

function pos(taskId: string): TaskPosition {
  return {
    assignee: 'dev1',
    duration: 1,
    startDay: 0,
    startPart: 0,
    taskId,
  };
}

describe('filterTasksNotOnSwimlane', () => {
  const tasks = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];

  it('returns all tasks when sprint is not selected', () => {
    const positions = new Map([['A', pos('A')]]);
    expect(filterTasksNotOnSwimlane(tasks, positions, null)).toEqual(tasks);
  });

  it('returns all tasks when positions are missing', () => {
    expect(filterTasksNotOnSwimlane(tasks, null, 42)).toEqual(tasks);
  });

  it('excludes tasks that already have a position on swimlane', () => {
    const positions = new Map([['B', pos('B')]]);
    expect(filterTasksNotOnSwimlane(tasks, positions, 42)).toEqual([{ id: 'A' }, { id: 'C' }]);
  });
});
