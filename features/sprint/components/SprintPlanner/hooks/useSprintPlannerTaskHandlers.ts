/**
 * Хук для обработчиков операций с задачами в SprintPlanner
 */

import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { Task, TaskPosition } from '@/types';

import { useCallback } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useTaskResize } from '@/features/task/hooks/useTaskResize';
import { useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';


interface UseSprintPlannerTaskHandlersProps {
  /** Задачи, QA-задачи и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  qaTaskManagement?: {
    createQATask: (devTaskId: string, qaTasksMap: Map<string, Task>, tasks: Task[]) => void;
  };
  /** Рабочих дней в таймлайне (длина спринта) */
  sprintTimelineWorkingDays?: number;
  debouncedUpdateXarrow: () => void;
  /** Нет qaEngineer на dev-задаче — открыть пикер QA (anchor с кнопки +) */
  onRequestQaEngineerPicker?: (devTaskId: string, anchorRect: DOMRect) => void;
}

export function useSprintPlannerTaskHandlers({
  board,
  qaTaskManagement,
  onRequestQaEngineerPicker,
  sprintTimelineWorkingDays = WORKING_DAYS,
  debouncedUpdateXarrow,
}: UseSprintPlannerTaskHandlersProps) {
  const { qaTasksMap, tasks } = board;
  const { setPositionsWithSave: setTaskPositions } = board.positions;
  const [syncEstimates] = useDataSyncEstimatesStorage();
  // Хук для обработки изменения размера задач
  const timelineTotalCells = sprintTimelineWorkingDays * getPartsPerDay();
  const setPlanTaskPositions = useCallback(
    (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => {
      setTaskPositions(updater, { recordHistory: true });
    },
    [setTaskPositions]
  );

  const { handleTaskResize } = useTaskResize({
    setTaskPositions: setPlanTaskPositions,
    timelineTotalCells,
    updateXarrow: debouncedUpdateXarrow,
    // Сохранение и пересчёт оценки — правило плана; жест ресайза — здесь.
    onAfterResize: (taskId, newDuration, updatedPosition) =>
      board.plan.afterResize(taskId, newDuration, updatedPosition, syncEstimates),
  });

  const handleCreateQATask = useCallback(
    (devTaskId: string, anchorRect?: DOMRect) => {
      const devTask = tasks.find((t) => t.id === devTaskId);
      const hasQaEngineer = Boolean(devTask?.qaEngineer?.trim());
      if (!hasQaEngineer) {
        if (anchorRect && onRequestQaEngineerPicker) {
          onRequestQaEngineerPicker(devTaskId, anchorRect);
        }
        return;
      }
      if (qaTaskManagement) {
        qaTaskManagement.createQATask(devTaskId, qaTasksMap, tasks);
      }
    },
    [qaTaskManagement, qaTasksMap, tasks, onRequestQaEngineerPicker]
  );

  // Поставить, снять и автодобавить задачу — `board.plan`.
  return {
    handleCreateQATask,
    handleTaskResize,
  };
}

