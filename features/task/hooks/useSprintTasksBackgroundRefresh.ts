'use client';

import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';
import { fetchSprintTasks } from '@/lib/beerTrackerApi';

/** Совпадает с TTL серверного кэша задач активного спринта (`SPRINT_ISSUES_CACHE_TTL_ACTIVE_SEC`). */
const SPRINT_TASKS_BACKGROUND_REFRESH_MS = 60_000;

/** Архив / released — задачи в спринте не меняются, опрос не нужен. */
const FROZEN_SPRINT_STATUSES = new Set(['archived', 'released']);

type FetchSprintTasksFn = typeof fetchSprintTasks;

/**
 * Тихо подтягивает задачи спринта (статусы двигают и вне планера).
 * Ответ применяется, только если кэш не менялся, пока шёл запрос: иначе
 * устаревший снимок затёр бы оптимистичную правку. Без снимка PG на сервере —
 * он может отставать от того, что уже на экране.
 */
export async function refreshSprintTasksInBackground(
  queryClient: QueryClient,
  sprintId: number,
  boardId: number | null,
  fetchTasks: FetchSprintTasksFn = fetchSprintTasks
): Promise<boolean> {
  const queryKey = sprintTasksQueryKey(sprintId, boardId);
  const before = queryClient.getQueryState(queryKey);
  if (!before?.data || before.fetchStatus === 'fetching' || queryClient.isMutating() > 0) {
    return false;
  }
  const data = await fetchTasks(sprintId, boardId ?? undefined, undefined, { skipSnapshots: true });
  const after = queryClient.getQueryState(queryKey);
  if (
    !after?.data ||
    after.dataUpdateCount !== before.dataUpdateCount ||
    queryClient.isMutating() > 0
  ) {
    return false;
  }
  queryClient.setQueryData(queryKey, data);
  return true;
}

/**
 * Периодическое обновление задач спринта, пока вкладка видима.
 * При возврате на вкладку — сразу, если с прошлого опроса прошёл интервал.
 */
export function useSprintTasksBackgroundRefresh(
  sprintId: number | null,
  boardId: number | null,
  sprintStatus: string | undefined
): void {
  const queryClient = useQueryClient();
  const frozen = FROZEN_SPRINT_STATUSES.has((sprintStatus ?? '').trim().toLowerCase());

  useEffect(() => {
    if (sprintId == null || frozen) {
      return;
    }
    let lastRunAt = Date.now();
    const run = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      lastRunAt = Date.now();
      refreshSprintTasksInBackground(queryClient, sprintId, boardId).catch((error: unknown) => {
        console.warn('[useSprintTasksBackgroundRefresh] background refresh failed:', error);
      });
    };
    const onVisibilityChange = () => {
      if (Date.now() - lastRunAt >= SPRINT_TASKS_BACKGROUND_REFRESH_MS) {
        run();
      }
    };
    const timer = window.setInterval(run, SPRINT_TASKS_BACKGROUND_REFRESH_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [boardId, frozen, queryClient, sprintId]);
}
