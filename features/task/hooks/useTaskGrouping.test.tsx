/** @vitest-environment jsdom */

import type { Developer, Task } from '@/types';

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTaskGrouping } from './useTaskGrouping';

describe('useTaskGrouping', () => {
  it('по исполнителю: заголовок из assigneeName, если исполнителя нет в developers', () => {
    const tasks: Task[] = [
      {
        id: 'DEV-1',
        name: 'Task',
        link: 'https://example.test/DEV-1',
        team: 'Web',
        assignee: 'tracker-user-42',
        assigneeName: 'Иван Иванов',
      },
    ];
    const developers: Developer[] = [];
    const { result } = renderHook(() =>
      useTaskGrouping({ tasks, groupBy: 'assignee', developers })
    );
    expect(result.current.groupKeys).toContain('Иван Иванов');
    expect(result.current.groupedTasks['Иван Иванов']).toEqual(tasks);
  });

  it('по исполнителю: имя из developers важнее assigneeName при совпадении id', () => {
    const tasks: Task[] = [
      {
        id: 'DEV-1',
        name: 'Task',
        link: 'https://example.test/DEV-1',
        team: 'Web',
        assignee: 'u1',
        assigneeName: 'Из трекера',
      },
    ];
    const developers: Developer[] = [{ id: 'u1', name: 'Как на доске', role: 'developer' }];
    const { result } = renderHook(() =>
      useTaskGrouping({ tasks, groupBy: 'assignee', developers })
    );
    expect(result.current.groupKeys).toContain('Как на доске');
    expect(result.current.groupedTasks['Как на доске']).toEqual(tasks);
  });
});
