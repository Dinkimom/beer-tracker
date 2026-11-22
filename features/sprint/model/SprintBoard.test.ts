import type { Task } from '@/types';

import { QueryClient } from '@tanstack/react-query';
import { autorun } from 'mobx';
import { describe, expect, it, vi } from 'vitest';

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
    boardId: 1,
    comments: createSprintComments(null, { current: { conflict: () => undefined, failure: () => undefined } }),
    forDemoPlanner: false,
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
  it('снятая с плана задача забирает с собой все свои связи, чужие остаются', () => {
    const { board } = setup([task('A-1'), task('A-2'), task('A-3')]);
    board.links.setWithSave(() => [
      { fromTaskId: 'A-1', id: 'l1', toTaskId: 'A-2' },
      { fromTaskId: 'comment:c1', id: 'l2', toTaskId: 'A-1' },
      { fromTaskId: 'A-2', id: 'l3', toTaskId: 'A-3' },
    ]);
    board.removeTaskLinks('A-1');
    expect(board.links.items.map((link) => link.id)).toEqual(['l3']);
  });

  it('видимые связи — только те, у которых оба конца на доске', () => {
    const { board } = setup([task('A-1'), task('A-2')]);
    board.links.setWithSave(() => [
      { fromTaskId: 'A-1', id: 'l1', toTaskId: 'A-2' },
      { fromTaskId: 'A-1', id: 'l2', toTaskId: 'B-9' },
    ]);
    expect(board.visibleLinks.map((link) => link.id)).toEqual(['l1']);
  });

  it('сохраняет у себя только связи с заметкой; связь двух задач — дело трекера', async () => {
    const { board } = setup([]);
    const save = vi.spyOn(board.links, 'save').mockResolvedValue();
    await board.savePlannerLink({ fromTaskId: 'A-1', id: 'l1', toTaskId: 'A-2' });
    expect(save).not.toHaveBeenCalled();
    const noteLink = { fromTaskId: 'comment:6f1c2a3e-1b2c-4d5e-8f90-1234567890ab', id: 'l2', toTaskId: 'A-2' };
    await board.savePlannerLink(noteLink);
    expect(save).toHaveBeenCalledWith(noteLink);
  });

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

  it('чья задача: строка доски важнее исполнителя в трекере, без карточки — исполнитель', () => {
    const { board, positions } = setup([task('A-1', { assignee: 'ann' }), task('A-2', { assignee: 'ann' })]);
    positions.positions.set('A-1', { assignee: 'bob', duration: 2, startDay: 0, startPart: 0, taskId: 'A-1' });
    expect(board.rowAssigneeOf({ assignee: 'ann', id: 'A-1' })).toBe('bob');
    expect(board.rowAssigneeOf({ assignee: 'ann', id: 'A-2' })).toBe('ann');
    expect(board.rowAssigneeOf({ id: 'A-3' })).toBeUndefined();

    // Та же функция, пока строки не менялись (сдвиг по дням), новая — после переноса в другую строку.
    const seen: unknown[] = [];
    const stop = autorun(() => seen.push(board.rowAssigneeOf));
    const before = board.rowAssigneeOf;
    positions.positions.set('A-1', { assignee: 'bob', duration: 2, startDay: 3, startPart: 0, taskId: 'A-1' });
    expect(board.rowAssigneeOf).toBe(before);
    positions.positions.set('A-1', { assignee: 'eve', duration: 2, startDay: 3, startPart: 0, taskId: 'A-1' });
    expect(board.rowAssigneeOf).not.toBe(before);
    stop();
  });
});
