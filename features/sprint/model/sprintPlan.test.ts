import type { TaskPositionsStore } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Developer, Task, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { getPartsPerDay } from '@/constants';

import { SprintPlan } from './sprintPlan';

function task(id: string, fields: Partial<Task> = {}): Task {
  return { id, link: `https://t/${id}`, name: id, team: 'Web', ...fields };
}

function setup(tasks: Task[], initial: TaskPosition[] = [], sprintId: number | null = 7) {
  let positions = new Map(initial.map((position) => [position.taskId, position]));
  let taskList = tasks;
  const store = {
    deletePosition: vi.fn(() => Promise.resolve()),
    savePosition: vi.fn(() => Promise.resolve()),
    setPositionsWithSave: vi.fn((updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => {
      positions = updater(positions);
    }),
  };
  const plan = new SprintPlan({
    positions: store as unknown as TaskPositionsStore,
    qaTasksByOriginalId: () => new Map(),
    sprintId,
    taskById: (taskId) => taskList.find((item) => item.id === taskId),
    tasksMap: () => new Map(taskList.map((item) => [item.id, item])),
    updateTasks: (updater) => {
      taskList = updater(taskList);
    },
  });
  return { plan, positions: () => positions, store, tasks: () => taskList };
}

const at = (taskId: string, startDay: number, duration: number, assignee = 'dev-1'): TaskPosition => ({
  assignee,
  duration,
  startDay,
  startPart: 0,
  taskId,
});

describe('SprintPlan', () => {
  it('поставленная руками задача тянет план за собой и сохраняется с шагом истории', () => {
    const { plan, positions, store } = setup([task('A-1')]);
    plan.place('A-1', at('A-1', 3, 2));
    expect(positions().get('A-1')).toMatchObject({ plannedDuration: 2, plannedStartDay: 3, plannedStartPart: 0 });
    expect(store.setPositionsWithSave).toHaveBeenCalledWith(expect.any(Function), { recordHistory: true });
    expect(store.savePosition).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'A-1' }), false, undefined);
  });

  it('локальный черновик ставится на доску, но на сервер не пишется', () => {
    const { plan, positions, store } = setup([task('local-1', { isLocalTask: true })]);
    plan.place('local-1', at('local-1', 0, 1));
    expect(positions().has('local-1')).toBe(true);
    expect(store.savePosition).not.toHaveBeenCalled();
  });

  it('снятие с плана убирает позицию и даты, чтобы задача не вернулась по датам трекера', () => {
    const { plan, positions, store, tasks } = setup(
      [task('A-1', { deadline: '2026-11-20', start: '2026-11-18' })],
      [at('A-1', 0, 2)]
    );
    plan.unplace('A-1');
    expect(positions().has('A-1')).toBe(false);
    expect(tasks()[0]).not.toHaveProperty('start');
    expect(store.deletePosition).toHaveBeenCalledWith('A-1');
  });

  it('автодобавление ставит задачу в первое свободное место строки исполнителя', () => {
    const developers = [{ id: 'dev-1', name: 'Ann' }] as Developer[];
    const busy = at('B-1', 0, getPartsPerDay());
    const { plan, positions } = setup([]);
    const placed = plan.autoAdd(task('A-1', { assignee: 'dev-1', storyPoints: 1 }), {
      developers,
      positions: new Map([['B-1', busy]]),
      timelineTotalCells: 10 * getPartsPerDay(),
    });
    expect(placed).toBe(true);
    expect(positions().get('A-1')).toMatchObject({ assignee: 'dev-1', startDay: 1, startPart: 0 });
  });

  it('без исполнителя на доске или без оценки автодобавление ничего не делает', () => {
    const { plan, store } = setup([]);
    const board = { developers: [] as Developer[], positions: new Map<string, TaskPosition>(), timelineTotalCells: 30 };
    expect(plan.autoAdd(task('A-1', { assignee: 'dev-1', storyPoints: 1 }), board)).toBe(false);
    expect(store.setPositionsWithSave).not.toHaveBeenCalled();
  });
});
