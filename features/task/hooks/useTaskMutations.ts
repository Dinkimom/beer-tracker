'use client';

import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';
import { fetchSprintTasks, fetchSprints } from '@/lib/beerTrackerApi';

function sprintsCacheQueryKey(forDemoPlanner: boolean, boardId: number) {
  return forDemoPlanner ? (['sprints', 'demo', boardId] as const) : (['sprints', boardId] as const);
}

function applyReloadTasksSuccess(
  queryClient: QueryClient,
  params: {
    boardId: number | null;
    forDemoPlanner: boolean;
    sprintId: number | null;
    sprintsData: unknown;
    tasksData: unknown;
  }
): void {
  const { boardId, forDemoPlanner, sprintId, sprintsData, tasksData } = params;
  queryClient.setQueryData(sprintTasksQueryKey(sprintId, boardId, forDemoPlanner), tasksData);
  if (sprintsData && boardId) {
    queryClient.setQueryData(sprintsCacheQueryKey(forDemoPlanner, boardId), sprintsData);
  }
}

/**
 * Хук для перезагрузки задач спринта (мутация)
 */
export function useReloadTasks(sprintId: number | null, boardId: number | null) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();

  return useMutation({
    mutationFn: async (_options?: { showToast?: boolean }) => {
      if (!sprintId) {
        throw new Error('Sprint ID is required');
      }

      const tasksPromise = fetchSprintTasks(sprintId, boardId || undefined, undefined, {
        refresh: true,
      });
      const sprintsPromise = boardId ? fetchSprints(boardId, { refresh: true }) : null;

      const [tasksData, sprintsData] = await Promise.all([
        tasksPromise,
        sprintsPromise,
      ]);

      return { tasksData, sprintsData };
    },
    onSuccess: ({ tasksData, sprintsData }, variables) => {
      applyReloadTasksSuccess(queryClient, {
        boardId,
        forDemoPlanner,
        sprintId,
        sprintsData,
        tasksData,
      });
      if (variables?.showToast) {
        toast.success(t('task.mutations.tasksUpdated'));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('task.mutations.tasksReloadFailed'));
    },
  });
}
