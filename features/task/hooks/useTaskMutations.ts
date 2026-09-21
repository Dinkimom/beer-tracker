'use client';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { applyReloadTasksSuccess } from '@/features/task/hooks/useTaskMutationsHelpers';
import { fetchSprintTasks, fetchSprints } from '@/lib/beerTrackerApi';

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
