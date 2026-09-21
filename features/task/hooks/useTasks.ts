'use client';

import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';
import type { StatusFilter } from '@/types';
import type { Task, Developer } from '@/types';
import type { SprintInfo } from '@/types/tracker';
import type { QueryClient } from '@tanstack/react-query';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchSprintTasks } from '@/lib/beerTrackerApi';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import {
  resolveStatusCategoryForStatusKey,
  sprintTaskCompletionRulesFromPlanner,
} from '@/lib/sprints/sprintTaskCompletion';
import { mapStatus } from '@/utils/statusMapper';

interface TasksResponse {
  developers: Developer[];
  sprintInfo: SprintInfo | null;
  tasks: Task[];
}

export function patchSprintInfoInTasksQueries(
  queryClient: QueryClient,
  sprintInfo: SprintInfo
): void {
  queryClient.setQueriesData<TasksResponse>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        return (
          (key[0] === 'tasks' && key[1] === sprintInfo.id) ||
          (key[0] === 'tasks' && key[1] === 'demo' && key[2] === sprintInfo.id)
        );
      },
    },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        sprintInfo: {
          ...(old.sprintInfo ?? {}),
          ...sprintInfo,
        },
      };
    }
  );
}

/**
 * Оптимистично обновляет массив `tasks` в кэше `useTasks` и во всех
 * снимках `useOccupancyTasks` той же пары спринт+доска.
 * Для occupancy после патча снова применяется фильтр статуса ключа.
 * Если записи в кэше ещё нет — ничего не делает.
 */
export function patchSprintTasksQuery(
  queryClient: QueryClient,
  sprintId: number | null,
  boardId: number | null | undefined,
  patch: Task[] | ((prev: Task[]) => Task[]),
  forDemoPlanner = false
): void {
  if (!sprintId) return;
  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => isSprintBoardTasksQueryKey(query.queryKey, sprintId, boardId, forDemoPlanner),
  });
  for (const query of queries) {
    queryClient.setQueryData<TasksResponse>(query.queryKey, (old) =>
      applySprintTasksPatch(old, patch, query.queryKey)
    );
  }
}

/**
 * Ключ React Query для списка задач спринта (`fetchSprintTasks`).
 * `boardId` нормализуется (`null` вместо `undefined`), чтобы совпадать с `useReloadTasks` и `setQueryData`.
 * `forDemoPlanner` — отдельный ключ кэша на `/demo/planner`, чтобы не смешивать с продуктом при совпадении id.
 */
export function sprintTasksQueryKey(
  sprintId: number | null,
  boardId?: number | null,
  forDemoPlanner = false
) {
  if (forDemoPlanner) {
    return ['tasks', 'demo', sprintId, boardId ?? null] as const;
  }
  return ['tasks', sprintId, boardId ?? null] as const;
}

export function occupancyTasksQueryKeyPrefix(
  sprintId: number | null,
  boardId?: number | null,
  forDemoPlanner = false
) {
  if (forDemoPlanner) {
    return ['tasks', 'demo', 'occupancy', sprintId, boardId ?? null] as const;
  }
  return ['tasks', 'occupancy', sprintId, boardId ?? null] as const;
}

export function occupancyTasksQueryKey(
  sprintId: number | null,
  boardId: number | null | undefined,
  statusFilter: StatusFilter,
  forDemoPlanner = false
) {
  return [...occupancyTasksQueryKeyPrefix(sprintId, boardId, forDemoPlanner), statusFilter] as const;
}

export function queryKeyTouchesSprintTasks(queryKey: readonly unknown[], sprintId: number): boolean {
  if (queryKey[0] !== 'tasks') {
    return false;
  }
  if (queryKey[1] === sprintId) {
    return true;
  }
  if (queryKey[1] === 'occupancy' && queryKey[2] === sprintId) {
    return true;
  }
  if (queryKey[1] === 'demo' && queryKey[2] === sprintId) {
    return true;
  }
  return queryKey[1] === 'demo' && queryKey[2] === 'occupancy' && queryKey[3] === sprintId;
}

function isSprintBoardTasksQueryKey(
  queryKey: readonly unknown[],
  sprintId: number,
  boardId: number | null | undefined,
  forDemoPlanner: boolean
): boolean {
  if (!queryKeyTouchesSprintTasks(queryKey, sprintId)) {
    return false;
  }
  const board = boardId ?? null;
  if (forDemoPlanner) {
    if (queryKey[1] === 'demo' && queryKey[2] === sprintId) {
      return queryKey[3] === board;
    }
    return queryKey[1] === 'demo' && queryKey[2] === 'occupancy' && queryKey[4] === board;
  }
  if (queryKey[1] === sprintId) {
    return queryKey[2] === board;
  }
  return queryKey[1] === 'occupancy' && queryKey[3] === board;
}

function applySprintTasksPatch(
  old: TasksResponse | undefined,
  patch: Task[] | ((prev: Task[]) => Task[]),
  queryKey: readonly unknown[]
): TasksResponse | undefined {
  if (!old) {
    return old;
  }
  const nextTasks = typeof patch === 'function' ? patch(old.tasks) : patch;
  return { ...old, tasks: filterTasksForQueryKey(nextTasks, queryKey) };
}

/** Патч статуса задачи во всех кэшах спринта — без refetch Tracker (индекс отстаёт). */
export function patchSprintTaskStatusInQueries(
  queryClient: QueryClient,
  sprintId: number | null,
  issueStatus: { issueKey: string; statusKey: string }
): void {
  if (!sprintId) {
    return;
  }
  const issueKey = issueStatus.issueKey.trim();
  const statusKey = issueStatus.statusKey.trim();
  if (!issueKey || !statusKey) {
    return;
  }
  queryClient.setQueriesData<TasksResponse>(
    { predicate: (query) => queryKeyTouchesSprintTasks(query.queryKey, sprintId) },
    (old) => patchTasksResponseStatus(old, issueKey, statusKey, queryClient)
  );
}

function patchTasksResponseStatus(
  old: TasksResponse | undefined,
  issueKey: string,
  statusKey: string,
  queryClient: QueryClient
): TasksResponse | undefined {
  if (!old?.tasks) {
    return old;
  }
  const rulesEntry = queryClient.getQueriesData<PlannerIntegrationRulesDto>({
    queryKey: ['planner-integration-rules'],
  })[0];
  const completionRules = sprintTaskCompletionRulesFromPlanner(rulesEntry?.[1]);
  const nextCategory =
    resolveStatusCategoryForStatusKey(statusKey, completionRules) ?? mapStatus(statusKey);
  let changed = false;
  const tasks = old.tasks.map((task) => {
    if (task.id !== issueKey && task.originalTaskId !== issueKey) {
      return task;
    }
    changed = true;
    return {
      ...task,
      originalStatus: statusKey,
      status: nextCategory,
    };
  });
  if (!changed) {
    return old;
  }
  return { ...old, tasks };
}

function isClosedSprintTask(task: Task): boolean {
  return (task.originalStatus ?? '').toLowerCase() === 'closed';
}

function occupancyFilterValue(value: unknown): 'active' | 'completed' | null {
  return value === 'active' || value === 'completed' ? value : null;
}

function occupancyStatusFilterFromQueryKey(
  queryKey: readonly unknown[]
): 'active' | 'completed' | null {
  if (queryKey[1] === 'occupancy') {
    return occupancyFilterValue(queryKey[4]);
  }
  if (queryKey[1] === 'demo' && queryKey[2] === 'occupancy') {
    return occupancyFilterValue(queryKey[5]);
  }
  return null;
}

function filterTasksForQueryKey(tasks: Task[], queryKey: readonly unknown[]): Task[] {
  return tasks.filter((task) => shouldUpsertTaskIntoQuery(queryKey, task));
}

function shouldUpsertTaskIntoQuery(queryKey: readonly unknown[], task: Task): boolean {
  const filter = occupancyStatusFilterFromQueryKey(queryKey);
  if (filter === 'completed') {
    return isClosedSprintTask(task);
  }
  if (filter === 'active') {
    return !isClosedSprintTask(task);
  }
  return true;
}

function retainLocalDescriptionOnUpsert(previous: Task, incoming: Task): Task {
  if (incoming.description || !previous.description) {
    return incoming;
  }
  return { ...incoming, description: previous.description };
}

function retainPlannerDraftParentOnUpsert(previous: Task, incoming: Task): Task {
  const previousKey = previous.parent?.id ?? previous.parent?.key;
  if (!previousKey || !isFeatureLaneDraftRowId(previousKey)) {
    return incoming;
  }
  const incomingKey = incoming.parent?.id ?? incoming.parent?.key;
  if (incomingKey && !isFeatureLaneDraftRowId(incomingKey)) {
    return incoming;
  }
  return { ...incoming, parent: previous.parent };
}

function mergeIncomingSprintTask(previous: Task, incoming: Task): Task {
  return retainPlannerDraftParentOnUpsert(
    previous,
    retainLocalDescriptionOnUpsert(previous, incoming)
  );
}

function upsertTaskInTasksResponse(
  old: TasksResponse | undefined,
  task: Task
): TasksResponse | undefined {
  if (!old?.tasks) {
    return old;
  }
  const issueKey = task.id;
  const index = old.tasks.findIndex((row) => row.id === issueKey);
  if (index >= 0) {
    const tasks = [...old.tasks];
    const previous = tasks[index] ?? task;
    tasks[index] = mergeIncomingSprintTask(previous, task);
    return { ...old, tasks };
  }
  return { ...old, tasks: [...old.tasks, task] };
}

/** Добавление задачи во все кэши спринта — без refetch Tracker (индекс отстаёт). */
export function upsertSprintTaskInQueries(
  queryClient: QueryClient,
  sprintId: number | null,
  task: Task
): void {
  const issueKey = task.id.trim();
  if (!sprintId || !issueKey) {
    return;
  }
  queryClient.setQueriesData<TasksResponse>(
    {
      predicate: (query) =>
        queryKeyTouchesSprintTasks(query.queryKey, sprintId) &&
        shouldUpsertTaskIntoQuery(query.queryKey, task),
    },
    (old) => upsertTaskInTasksResponse(old, task)
  );
}

export function removeSprintTaskFromQueries(
  queryClient: QueryClient,
  sprintId: number | null,
  issueKey: string
): void {
  const key = issueKey.trim();
  if (!sprintId || !key) {
    return;
  }
  queryClient.setQueriesData<TasksResponse>(
    { predicate: (query) => queryKeyTouchesSprintTasks(query.queryKey, sprintId) },
    (old) => removeTaskFromTasksResponse(old, key)
  );
}

function removeTaskFromTasksResponse(
  old: TasksResponse | undefined,
  issueKey: string
): TasksResponse | undefined {
  if (!old?.tasks) {
    return old;
  }
  const tasks = old.tasks.filter((task) => task.id !== issueKey && task.originalTaskId !== issueKey);
  if (tasks.length === old.tasks.length) {
    return old;
  }
  return { ...old, tasks };
}

export function reloadSprintTasksQueries(
  queryClient: QueryClient,
  sprintId: number | null
): Promise<void> {
  if (!sprintId) {
    return Promise.resolve();
  }
  return queryClient.invalidateQueries({
    predicate: (query) => queryKeyTouchesSprintTasks(query.queryKey, sprintId),
  });
}

/**
 * Сброс кэша палитры и задач после сохранения настроек статусов в админке.
 * `removeQueries`, не invalidate: глобально refetchOnMount=false, иначе останется старый снимок.
 */
export function resetPlannerPaletteQueryCaches(
  queryClient: QueryClient,
  organizationId: string
): void {
  const orgId = organizationId.trim();
  if (orgId) {
    queryClient.removeQueries({ queryKey: ['planner-integration-rules', orgId] });
  }
  queryClient.removeQueries({ queryKey: ['tasks'] });
}

/**
 * Хук для загрузки задач спринта
 */
export function useTasks(sprintId: number | null, boardId?: number | null) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  return useQuery({
    queryKey: sprintTasksQueryKey(sprintId, boardId, forDemoPlanner),
    queryFn: (): Promise<TasksResponse> => {
      if (!sprintId) {
        throw new Error('Sprint ID is required');
      }

      return fetchSprintTasks(sprintId, boardId || undefined);
    },
    enabled: !!sprintId,
    staleTime: 1000 * 60 * 2, // 2 минуты (задачи меняются чаще)
  });
}

/**
 * Загрузка задач спринта с фильтром по статусу для вкладки «Занятость».
 * При смене фильтра уходит запрос на бэкенд, пока данные грузятся — показывается лоадер.
 * Запрос выполняется только когда enabled === true (например, только в режиме «По задачам»).
 */
export function useOccupancyTasks(
  sprintId: number | null,
  boardId: number | null | undefined,
  statusFilter: StatusFilter,
  options?: { enabled?: boolean }
) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const enabled = options?.enabled !== false;
  return useQuery({
    queryKey: occupancyTasksQueryKey(sprintId, boardId, statusFilter, forDemoPlanner),
    queryFn: (): Promise<TasksResponse> => {
      if (!sprintId) {
        throw new Error('Sprint ID is required');
      }
      return fetchSprintTasks(sprintId, boardId ?? undefined, statusFilter);
    },
    enabled: !!sprintId && enabled,
    staleTime: 1000 * 60 * 2,
  });
}
