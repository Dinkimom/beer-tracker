/**
 * Хук для учета работы по задаче (account work)
 */

import type { Task } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

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
  const handleAccountWork = useCallback(
    async (accountWorkModal: Task, data: AccountWorkData) => {
      if (!selectedSprintId) return;

      try {
        await runAccountWorkWithRollback({
          accountWorkModal,
          data,
          onTasksReload,
          setTasks,
          tasks,
        });
        toast.success('Работа учтена');
      } catch (error) {
        console.error('Error accounting work:', error);
        throw error;
      }
    },
    [tasks, selectedSprintId, setTasks, onTasksReload]
  );

  return { handleAccountWork };
}
