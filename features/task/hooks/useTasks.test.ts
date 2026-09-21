import type { Task } from '@/types';

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  occupancyTasksQueryKey,
  patchSprintInfoInTasksQueries,
  patchSprintTaskStatusInQueries,
  patchSprintTasksQuery,
  queryKeyTouchesSprintTasks,
  removeSprintTaskFromQueries,
  resetPlannerPaletteQueryCaches,
  sprintTasksQueryKey,
  upsertSprintTaskInQueries,
} from './useTasks';

describe('sprintTasksQueryKey', () => {
  it('нормализует boardId: undefined → null в ключе', () => {
    expect(sprintTasksQueryKey(10, undefined)).toEqual(['tasks', 10, null]);
  });

  it('сохраняет числовой boardId', () => {
    expect(sprintTasksQueryKey(10, 5)).toEqual(['tasks', 10, 5]);
  });

  it('добавляет сегмент demo для демо-планера', () => {
    expect(sprintTasksQueryKey(10, 5, true)).toEqual(['tasks', 'demo', 10, 5]);
  });

  it('не путает sprintId с boardId при инвалидации задач', () => {
    expect(queryKeyTouchesSprintTasks(sprintTasksQueryKey(12, 12), 12)).toBe(true);
    expect(queryKeyTouchesSprintTasks(sprintTasksQueryKey(5, 12), 12)).toBe(false);
    expect(queryKeyTouchesSprintTasks(sprintTasksQueryKey(12, 12, true), 12)).toBe(true);
    expect(queryKeyTouchesSprintTasks(['tasks', 'occupancy', 12, 8, 'all'], 12)).toBe(true);
    expect(queryKeyTouchesSprintTasks(['tasks', 'demo', 'occupancy', 12, 8, 'all'], 12)).toBe(true);
    expect(queryKeyTouchesSprintTasks(['sprints', 12], 12)).toBe(false);
  });
});

describe('patchSprintTasksQuery', () => {
  it('обновляет только tasks в кэше', () => {
    const qc = new QueryClient();
    const bundle = {
      developers: [{ id: 'd1', name: 'A' }],
      sprintInfo: { id: 1, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [{ id: 't1', name: 'X' } as Task],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1), bundle);

    patchSprintTasksQuery(qc, 5, 1, (prev) => [...prev, { id: 't2', name: 'Y' } as Task]);

    const next = qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1));
    expect(next?.tasks).toHaveLength(2);
    expect(next?.developers).toEqual(bundle.developers);
    expect(next?.sprintInfo).toEqual(bundle.sprintInfo);
  });

  it('при пустом кэше ничего не пишет', () => {
    const qc = new QueryClient();
    patchSprintTasksQuery(qc, 5, 1, () => []);
    expect(qc.getQueryData(sprintTasksQueryKey(5, 1))).toBeUndefined();
  });

  it('пишет в демо-ключ при forDemoPlanner', () => {
    const qc = new QueryClient();
    const bundle = {
      developers: [],
      sprintInfo: null,
      tasks: [{ id: 't1', name: 'X' } as Task],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1, true), bundle);
    patchSprintTasksQuery(qc, 5, 1, (prev) => [...prev, { id: 't2', name: 'Y' } as Task], true);
    const after = qc.getQueryData<{ tasks: Task[] }>(sprintTasksQueryKey(5, 1, true));
    expect(after?.tasks).toHaveLength(2);
  });

  it('зеркалит патч в occupancy-кэши той же доски и отсекает по фильтру статуса', () => {
    const qc = new QueryClient();
    const openTask = { id: 't1', name: 'Open', originalStatus: 'inProgress' } as Task;
    const closedTask = { id: 't2', name: 'Done', originalStatus: 'closed' } as Task;
    const bundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [openTask],
    };
    const activeKey = occupancyTasksQueryKey(5, 1, 'active');
    const completedKey = occupancyTasksQueryKey(5, 1, 'completed');
    const otherBoardKey = occupancyTasksQueryKey(5, 9, 'active');
    qc.setQueryData(sprintTasksQueryKey(5, 1), bundle);
    qc.setQueryData(activeKey, bundle);
    qc.setQueryData(completedKey, { ...bundle, tasks: [] as Task[] });
    qc.setQueryData(otherBoardKey, bundle);

    patchSprintTasksQuery(qc, 5, 1, [openTask, closedTask]);

    expect(qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1))?.tasks.map((task) => task.id)).toEqual([
      't1',
      't2',
    ]);
    expect(qc.getQueryData<typeof bundle>(activeKey)?.tasks.map((task) => task.id)).toEqual(['t1']);
    expect(qc.getQueryData<typeof bundle>(completedKey)?.tasks.map((task) => task.id)).toEqual(['t2']);
    expect(qc.getQueryData<typeof bundle>(otherBoardKey)?.tasks.map((task) => task.id)).toEqual(['t1']);
  });
});

describe('patchSprintInfoInTasksQueries', () => {
  it('обновляет sprintInfo во всех query текущего спринта', () => {
    const qc = new QueryClient();
    const currentBundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'Sprint 5', status: 'draft', version: 1 },
      tasks: [{ id: 't1', name: 'X' } as Task],
    };
    const otherBundle = {
      developers: [],
      sprintInfo: { id: 6, name: 'Sprint 6', status: 'draft', version: 1 },
      tasks: [{ id: 't2', name: 'Y' } as Task],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1), currentBundle);
    qc.setQueryData(sprintTasksQueryKey(5, 1, true), currentBundle);
    qc.setQueryData(sprintTasksQueryKey(6, 1), otherBundle);

    patchSprintInfoInTasksQueries(qc, {
      id: 5,
      name: 'Sprint 5',
      status: 'in_progress',
      startDate: '2026-05-01',
      startDateTime: '2026-05-01T00:00:00.000+0000',
      endDate: '2026-05-14',
      endDateTime: '2026-05-14T00:00:00.000+0000',
      version: 2,
    });

    expect(qc.getQueryData<typeof currentBundle>(sprintTasksQueryKey(5, 1))?.sprintInfo).toMatchObject({
      status: 'in_progress',
      version: 2,
    });
    expect(qc.getQueryData<typeof currentBundle>(sprintTasksQueryKey(5, 1, true))?.sprintInfo).toMatchObject({
      status: 'in_progress',
      version: 2,
    });
    expect(qc.getQueryData<typeof otherBundle>(sprintTasksQueryKey(6, 1))?.sprintInfo).toEqual(
      otherBundle.sprintInfo
    );
  });

  it('fills sprintInfo when the tasks payload had none', () => {
    const qc = new QueryClient();
    qc.setQueryData(sprintTasksQueryKey(5, 1), {
      developers: [],
      sprintInfo: null,
      tasks: [],
    });

    patchSprintInfoInTasksQueries(qc, {
      id: 5,
      name: 'Sprint 5',
      status: 'in_progress',
      startDate: '2026-05-01',
      startDateTime: '2026-05-01T00:00:00.000+0000',
      endDate: '2026-05-14',
      endDateTime: '2026-05-14T00:00:00.000+0000',
      version: 2,
    });

    expect(qc.getQueryData<{ sprintInfo: { status: string } }>(sprintTasksQueryKey(5, 1))?.sprintInfo).toMatchObject({
      status: 'in_progress',
      version: 2,
    });
  });
});

describe('patchSprintTaskStatusInQueries', () => {
  it('updates originalStatus and mapped status for the matching issue', () => {
    const qc = new QueryClient();
    const bundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [
        { id: 'BT-1', name: 'A', originalStatus: 'open', status: 'todo' as const },
        { id: 'BT-2', name: 'B', originalStatus: 'open', status: 'todo' as const },
      ] as Task[],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1), bundle);

    patchSprintTaskStatusInQueries(qc, 5, { issueKey: 'BT-1', statusKey: 'inProgress' });

    const next = qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1));
    expect(next?.tasks[0]).toMatchObject({ id: 'BT-1', originalStatus: 'inProgress', status: 'in-progress' });
    expect(next?.tasks[1]).toMatchObject({ id: 'BT-2', originalStatus: 'open', status: 'todo' });
  });
});

describe('upsertSprintTaskInQueries', () => {
  it('appends a new issue and replaces an existing one', () => {
    const qc = new QueryClient();
    const bundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [{ id: 'BT-1', name: 'Old' }] as Task[],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1), bundle);

    upsertSprintTaskInQueries(qc, 5, { id: 'BT-1', name: 'Updated' } as Task);
    upsertSprintTaskInQueries(qc, 5, { id: 'BT-2', name: 'New' } as Task);

    expect(qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1))?.tasks.map((task) => task.id)).toEqual([
      'BT-1',
      'BT-2',
    ]);
    expect(qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1))?.tasks[0]?.name).toBe('Updated');
  });

  it('keeps a locally saved description when upsert snapshot has none', () => {
    const qc = new QueryClient();
    const bundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [{ id: 'BT-1', name: 'Old', description: 'Saved locally' }] as Task[],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1), bundle);

    upsertSprintTaskInQueries(qc, 5, { id: 'BT-1', name: 'From snapshot' } as Task);

    expect(qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1))?.tasks[0]).toMatchObject({
      description: 'Saved locally',
      name: 'From snapshot',
    });
  });

  it('keeps a planner feature-draft parent when Tracker snapshot has none', () => {
    const qc = new QueryClient();
    const draftParent = {
      display: 'Пупи',
      id: 'feature-draft:1',
      key: 'feature-draft:1',
    };
    const bundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [{ id: 'BT-1', name: 'Local', parent: draftParent }] as Task[],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1), bundle);

    upsertSprintTaskInQueries(qc, 5, { id: 'BT-1', name: 'From snapshot' } as Task);

    expect(qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1))?.tasks[0]).toMatchObject({
      name: 'From snapshot',
      parent: draftParent,
    });
  });

  it('skips occupancy caches whose status filter does not match the task', () => {
    const qc = new QueryClient();
    const activeKey = ['tasks', 'occupancy', 5, 1, 'active'] as const;
    const completedKey = ['tasks', 'occupancy', 5, 1, 'completed'] as const;
    const activeBundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [] as Task[],
    };
    qc.setQueryData(activeKey, activeBundle);
    qc.setQueryData(completedKey, activeBundle);

    upsertSprintTaskInQueries(qc, 5, {
      id: 'BT-1',
      name: 'Open',
      originalStatus: 'inProgress',
    } as Task);

    expect(qc.getQueryData<typeof activeBundle>(activeKey)?.tasks.map((task) => task.id)).toEqual(['BT-1']);
    expect(qc.getQueryData<typeof activeBundle>(completedKey)?.tasks).toEqual([]);
  });
});

describe('removeSprintTaskFromQueries', () => {
  it('drops the matching issue from the sprint tasks cache', () => {
    const qc = new QueryClient();
    const bundle = {
      developers: [],
      sprintInfo: { id: 5, name: 'S', status: 'in_progress' as const, version: 1 },
      tasks: [
        { id: 'BT-1', name: 'A' },
        { id: 'BT-2', name: 'B' },
      ] as Task[],
    };
    qc.setQueryData(sprintTasksQueryKey(5, 1), bundle);

    removeSprintTaskFromQueries(qc, 5, 'BT-1');

    expect(qc.getQueryData<typeof bundle>(sprintTasksQueryKey(5, 1))?.tasks.map((task) => task.id)).toEqual([
      'BT-2',
    ]);
  });
});

describe('resetPlannerPaletteQueryCaches', () => {
  it('removes planner rules and all sprint task caches', () => {
    const qc = new QueryClient();
    const orgId = 'org-1';
    qc.setQueryData(['planner-integration-rules', orgId], { configRevision: 1 });
    qc.setQueryData(['planner-integration-rules', 'org-other'], { configRevision: 9 });
    qc.setQueryData(sprintTasksQueryKey(5, 1), { tasks: [] });
    qc.setQueryData(occupancyTasksQueryKey(5, 1, 'all'), { tasks: [] });
    qc.setQueryData(['sprints', 5], { items: [] });

    resetPlannerPaletteQueryCaches(qc, orgId);

    expect(qc.getQueryData(['planner-integration-rules', orgId])).toBeUndefined();
    expect(qc.getQueryData(['planner-integration-rules', 'org-other'])).toEqual({ configRevision: 9 });
    expect(qc.getQueryData(sprintTasksQueryKey(5, 1))).toBeUndefined();
    expect(qc.getQueryData(occupancyTasksQueryKey(5, 1, 'all'))).toBeUndefined();
    expect(qc.getQueryData(['sprints', 5])).toEqual({ items: [] });
  });
});
