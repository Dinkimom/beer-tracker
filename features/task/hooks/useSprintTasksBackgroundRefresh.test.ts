import type { Task } from '@/types';

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { refreshSprintTasksInBackground } from './useSprintTasksBackgroundRefresh';
import { patchSprintTasksQuery, sprintTasksQueryKey } from './useTasks';

function task(id: string, originalStatus: string): Task {
  return { id, name: id, originalStatus } as Task;
}

function response(tasks: Task[]) {
  return { developers: [], sprintInfo: null, tasks };
}

describe('refreshSprintTasksInBackground', () => {
  it('применяет свежий ответ и просит сервер обойтись без снимка PG', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sprintTasksQueryKey(7, 3), response([task('BT-1', 'open')]));
    const fetchTasks = vi.fn().mockResolvedValue(response([task('BT-1', 'inProgress')]));

    const applied = await refreshSprintTasksInBackground(queryClient, 7, 3, fetchTasks);

    expect(applied).toBe(true);
    expect(fetchTasks).toHaveBeenCalledWith(7, 3, undefined, { skipSnapshots: true });
    expect(
      queryClient.getQueryData<ReturnType<typeof response>>(sprintTasksQueryKey(7, 3))?.tasks[0]
        ?.originalStatus
    ).toBe('inProgress');
  });

  it('не затирает оптимистичную правку, сделанную пока шёл запрос', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sprintTasksQueryKey(7, 3), response([task('BT-1', 'open')]));
    const fetchTasks = vi.fn().mockImplementation(() => {
      patchSprintTasksQuery(queryClient, 7, 3, [task('BT-1', 'review')]);
      return Promise.resolve(response([task('BT-1', 'open')]));
    });

    const applied = await refreshSprintTasksInBackground(queryClient, 7, 3, fetchTasks);

    expect(applied).toBe(false);
    expect(
      queryClient.getQueryData<ReturnType<typeof response>>(sprintTasksQueryKey(7, 3))?.tasks[0]
        ?.originalStatus
    ).toBe('review');
  });

  it('не ходит на сервер, пока кэш ещё не загружен', async () => {
    const queryClient = new QueryClient();
    const fetchTasks = vi.fn();

    const applied = await refreshSprintTasksInBackground(queryClient, 7, null, fetchTasks);

    expect(applied).toBe(false);
    expect(fetchTasks).not.toHaveBeenCalled();
  });
});
