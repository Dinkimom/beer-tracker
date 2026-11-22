import type { Task } from '@/types';

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backlogQueryKey } from '@/features/backlog/hooks/useBacklog';
import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';
import { addIssueToSprint, removeIssueFromSprint } from '@/lib/beerTrackerApi';

import { moveBacklogTask, TrackerMoveRejectedError } from './backlogTaskMove';

vi.mock('@/lib/beerTrackerApi', () => ({ addIssueToSprint: vi.fn(), removeIssueFromSprint: vi.fn() }));

const BOARD = 3;
const task = (id: string) => ({ id, link: '', name: id, team: 'Web' }) as Task;

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(backlogQueryKey(BOARD, false), { developers: [], tasks: [task('B-1'), task('B-2')] });
  queryClient.setQueryData(sprintTasksQueryKey(10, BOARD, false), { developers: [], sprintInfo: null, tasks: [task('S-1')] });
  queryClient.setQueryData(sprintTasksQueryKey(11, BOARD, false), { developers: [], sprintInfo: null, tasks: [] });
  const scope = { boardId: BOARD, forDemoPlanner: false, queryClient };
  const ids = (key: readonly unknown[]) => queryClient.getQueryData<{ tasks: Task[] }>(key)?.tasks.map((item) => item.id);
  return {
    backlog: () => ids(backlogQueryKey(BOARD, false)),
    scope,
    sprint: (id: number) => ids(sprintTasksQueryKey(id, BOARD, false)),
  };
}

describe('moveBacklogTask', () => {
  beforeEach(() => {
    vi.mocked(addIssueToSprint).mockReset().mockResolvedValue(true);
    vi.mocked(removeIssueFromSprint).mockReset().mockResolvedValue(true);
  });

  it('из бэклога в спринт: колонки меняются сразу, в трекер — только добавление', async () => {
    const { backlog, scope, sprint } = setup();
    const moving = moveBacklogTask(scope, { from: 'backlog', task: task('B-1'), to: 10 });
    expect(backlog()).toEqual(['B-2']);
    expect(sprint(10)).toEqual(['S-1', 'B-1']);
    await moving;
    expect(addIssueToSprint).toHaveBeenCalledWith('B-1', 10);
    expect(removeIssueFromSprint).not.toHaveBeenCalled();
  });

  it('из спринта в спринт: снять с исходного, добавить в целевой', async () => {
    const { scope, sprint } = setup();
    await moveBacklogTask(scope, { from: 10, task: task('S-1'), to: 11 });
    expect(removeIssueFromSprint).toHaveBeenCalledWith('S-1', 10);
    expect(addIssueToSprint).toHaveBeenCalledWith('S-1', 11);
    expect([sprint(10), sprint(11)]).toEqual([[], ['S-1']]);
  });

  it('трекер отказал — обе колонки как были, ошибка доходит до вызывающего', async () => {
    vi.mocked(removeIssueFromSprint).mockResolvedValue(false);
    const { backlog, scope, sprint } = setup();
    await expect(moveBacklogTask(scope, { from: 10, task: task('S-1'), to: 'backlog' })).rejects.toBeInstanceOf(
      TrackerMoveRejectedError
    );
    expect(backlog()).toEqual(['B-1', 'B-2']);
    expect(sprint(10)).toEqual(['S-1']);
  });
});
