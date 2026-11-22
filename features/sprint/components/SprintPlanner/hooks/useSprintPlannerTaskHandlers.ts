/**
 * Хук для обработчиков операций с задачами в SprintPlanner
 */

import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { Task, TaskPosition } from '@/types';

import { useCallback } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useTaskResize } from '@/features/task/hooks/useTaskResize';
import { useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';

import { handleTaskResizeAfterResize } from './sprintPlannerTaskHandlersResizeHelpers';

interface UseSprintPlannerTaskHandlersProps {
  /** Задачи, QA-задачи и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  qaTaskManagement?: {
    createQATask: (devTaskId: string, qaTasksMap: Map<string, Task>, tasks: Task[]) => void;
  };
  /** Рабочих дней в таймлайне (длина спринта) */
  sprintTimelineWorkingDays?: number;
  tasksMap: Map<string, Task>;
  debouncedUpdateXarrow: () => void;
  /** Нет qaEngineer на dev-задаче — открыть пикер QA (anchor с кнопки +) */
  onRequestQaEngineerPicker?: (devTaskId: string, anchorRect: DOMRect) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function useSprintPlannerTaskHandlers({
  board,
  qaTaskManagement,
  onRequestQaEngineerPicker,
  sprintTimelineWorkingDays = WORKING_DAYS,
  setTasks,
  tasksMap,
  debouncedUpdateXarrow,
}: UseSprintPlannerTaskHandlersProps) {
  const { qaTasksByOriginalId, qaTasksMap, tasks } = board;
  const { savePosition, setPositionsWithSave: setTaskPositions } = board.positions;
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
    onAfterResize: (taskId, newDuration, updatedPosition) => {
      handleTaskResizeAfterResize(
        taskId,
        newDuration,
        updatedPosition,
        tasksMap,
        qaTasksByOriginalId,
        setTasks,
        syncEstimates,
        savePosition
      );
    },
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

