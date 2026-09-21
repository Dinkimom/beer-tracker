/**
 * Хук для обработчиков взаимодействия с задачами в SprintPlanner
 */

import type { Task } from '@/types';

import { useCallback } from 'react';

import { useRootStore } from '@/lib/layers';

import { useAccountWork } from '../../../../../hooks/useAccountWork';

interface UseSprintPlannerTaskInteractionHandlersProps {
  selectedSprintId: number | null;
  tasks: Task[];
  onTasksReload?: () => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function useSprintPlannerTaskInteractionHandlers({
  selectedSprintId,
  setTasks,
  tasks,
  onTasksReload,
}: UseSprintPlannerTaskInteractionHandlersProps) {
  const { sprintPlannerUi } = useRootStore();

  // Хук для учета работы
  const { handleAccountWork: handleAccountWorkHook } = useAccountWork({
    tasks,
    selectedSprintId,
    setTasks,
    onTasksReload,
  });

  const handleAccountWork = useCallback(
    async (data: {
      burnedStoryPoints: number;
      burnedTestPoints: number;
      newTaskTitle: string;
      remainingStoryPoints: number;
      remainingTestPoints: number;
      targetSprintId: number | null;
    }) => {
      const modalTask = sprintPlannerUi.accountWorkModal;
      if (!modalTask) return;
      await handleAccountWorkHook(modalTask, data);
    },
    [sprintPlannerUi, handleAccountWorkHook]
  );

  // Обработчик клика по задаче
  const handleTaskClick = useCallback(
    (_taskId: string, _shiftKey = false) => {
      if (sprintPlannerUi.contextMenuTaskId !== null) return;
    },
    [sprintPlannerUi]
  );

  const handleTaskInfoFieldsSaved = useCallback(
    (fields: { description?: string; name?: string }) => {
      const panelTask = sprintPlannerUi.taskInfoPanelTask;
      if (!panelTask) {
        return;
      }
      sprintPlannerUi.patchTaskInfoPanelTask(fields);
      setTasks((prev) =>
        prev.map((task) => (task.id === panelTask.id ? { ...task, ...fields } : task))
      );
    },
    [setTasks, sprintPlannerUi]
  );

  return {
    handleAccountWork,
    handleTaskClick,
    handleTaskInfoFieldsSaved,
  };
}

