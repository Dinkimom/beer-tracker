import type { Task } from '@/types';

import { QueryClient } from '@tanstack/react-query';
import { autorun } from 'mobx';
import { describe, expect, it } from 'vitest';

import { SprintMovePlacementStore } from '@/lib/layers/application/mobx/stores/sprintMovePlacementStore';
import { TaskPositionsStore } from '@/lib/layers/application/mobx/stores/taskPositionsStore';

import { SprintBoard } from './SprintBoard';
import { createSprintComments } from './sprintComments';
import { createSprintLinks } from './sprintLinks';

const KEY = ['tasks', 7, 1] as const;

function task(id: string, overrides: Partial<Task> = {}): Task {
  return { id, link: `https://t/${id}`, name: id, team: 'Web', ...overrides };
}

function setup(tasks: Task[]) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(KEY, { developers: [], sprintInfo: null, tasks });
  const movePlacement = new SprintMovePlacementStore();
  const positions = new TaskPositionsStore();
  const board = new SprintBoard({
    comments: createSprintComments(null, { current: { conflict: () => undefined, failure: () => undefined } }),
    links: createSprintLinks(null),
    movePlacement,
    positions,
    queryClient,
    sprintEndDate: null,
    sprintId: 7,
    sprintStartDate: null,
    tasksQueryKey: KEY,
  });
  return { board, movePlacement, positions, queryClient };
}

describe('SprintBoard', () => {
  it('держит ссылку на ответ кэша, а не копию, и выводит QA-задачи', () => {
    const dev = task('A-1', { storyPoints: 3, testPoints: 2 });
    const { board, queryClient } = setup([dev, task('A-2')]);
    expect(board.tasks).toBe(queryClient.getQueryData<{ tasks: Task[] }>(KEY)?.tasks);
    expect(board.qaTasksMap.has('A-1')).toBe(true);
    // Вне реакции computed не кэшируются: сравниваем по id, а не по ссылке.
    expect(board.qaTasksByOriginalId.get('A-1')?.id).toBe(board.qaTasksMap.get('A-1')?.id);
    expect(board.tasksMap.has('A-2')).toBe(true);
    expect(board.allTasksForDrag).toHaveLength(3);
  });

  it('видит правку кэша после connect', () => {
    const { board, queryClient } = setup([task('A-1')]);
    const disconnect = board.connect();
    queryClient.setQueryData(KEY, { developers: [], sprintInfo: null, tasks: [task('A-1'), task('A-3')] });
    expect(board.tasksMap.has('A-3')).toBe(true);
    disconnect();
  });

  it('добавляет задачу, которую переносят в этот спринт с выбором места', () => {
    const { board, movePlacement } = setup([task('A-1')]);
    movePlacement.start({
      kind: 'task',
      sourcePositionDuration: null,
      sourceSprintId: 3,
      targetSprintId: 7,
      task: task('B-9'),
    } as Parameters<SprintMovePlacementStore['start']>[0]);
    expect(board.tasks.map((t) => t.id)).toEqual(['A-1', 'B-9']);
  });

  it('видимые позиции — только задачи доски; ссылка не меняется, пока геометрия та же', () => {
    const { board, positions } = setup([task('A-1')]);
    const geometry = { assignee: 'dev', duration: 2, startDay: 0, startPart: 0 };
    positions.positions.set('A-1', { ...geometry, taskId: 'A-1' });
    positions.positions.set('GONE-1', { ...geometry, taskId: 'GONE-1' });
    const seen: Array<Map<string, unknown>> = [];
    const stop = autorun(() => seen.push(board.visiblePositions));
    expect([...seen[0].keys()]).toEqual(['A-1']);
    positions.positions.set('A-1', { ...geometry, taskId: 'A-1' });
    expect(seen).toHaveLength(1);
    positions.positions.set('A-1', { ...geometry, startDay: 3, taskId: 'A-1' });
    expect(seen).toHaveLength(2);
    stop();
  });
});
