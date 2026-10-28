/**
 * Хук для учета работы по задаче (account work)
 */

import type { Task } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useSprintTaskCompletionRules } from '@/hooks/useSprintTaskCompletionRules';

import {
  runAccountWorkWithRollback,
  type AccountWorkData,
} from './useAccountWorkHelpers';

interface UseAccountWorkProps {
  selectedSprintId: number | null;
  tasks: Task[];
  onTasksReload?: () => Promise<void> | void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function useAccountWork({ tasks, selectedSprintId, setTasks, onTasksReload }: UseAccountWorkProps) {
  const { t } = useI18n();
  const completionRules = useSprintTaskCompletionRules();
  const handleAccountWork = useCallback(
    async (accountWorkModal: Task, data: AccountWorkData) => {
      if (!selectedSprintId) return;

      try {
        await runAccountWorkWithRollback({
          accountWorkModal,
          completionRules,
          data,
          onTasksReload,
          setTasks,
          tasks,
        });
        toast.success(t('sprint.taskToast.workLogged'));
      } catch (error) {
        console.error('Error accounting work:', error);
        throw error;
      }
    },
    [completionRules, tasks, selectedSprintId, setTasks, onTasksReload, t]
  );

  return { handleAccountWork };
}
