import type { Developer, Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { collectBacklogFilterPeople, filterTasksByAssignees } from './backlogFilterPeople';

function person(id: string, name: string): Developer {
  return { id, name, role: 'developer' };
}

function task(id: string, assignee?: string, assigneeName?: string): Task {
  return { assignee, assigneeName, id, name: id } as Task;
}

describe('collectBacklogFilterPeople', () => {
  it('keeps people who have tasks and orders them by how many', () => {
    const people = collectBacklogFilterPeople({
      backlogDevelopers: [person('a', 'Ann'), person('b', 'Ben')],
      backlogTasks: [task('1', 'a', 'Ann')],
      sprintBundles: [
        {
          developers: [person('b', 'Ben'), person('c', 'Cara')],
          tasks: [task('2', 'b'), task('3', 'b'), task('4', 'c', 'Cara')],
        },
      ],
    });

    expect(people.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('uses the assignee name when the person is not in the developer list', () => {
    const people = collectBacklogFilterPeople({
      backlogDevelopers: [],
      backlogTasks: [task('1', 'missing', 'Temirlan Shaikenov')],
      sprintBundles: [],
    });

    expect(people).toEqual([{ avatarUrl: null, id: 'missing', name: 'Temirlan Shaikenov' }]);
  });
});

describe('filterTasksByAssignees', () => {
  const tasks = [task('1', 'a'), task('2', 'b'), task('3')];

  it('returns every task when nobody is selected', () => {
    expect(filterTasksByAssignees(tasks, new Set())).toEqual(tasks);
  });

  it('keeps tasks of the selected people', () => {
    expect(filterTasksByAssignees(tasks, new Set(['b'])).map((item) => item.id)).toEqual(['2']);
  });
});
