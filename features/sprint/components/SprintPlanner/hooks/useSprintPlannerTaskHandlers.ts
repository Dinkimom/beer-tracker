/**
 * Хук для обработчиков операций с задачами в SprintPlanner
 */

import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Developer, Task, TaskPosition } from '@/types';

import { useCallback } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useTaskResize } from '@/features/task/hooks/useTaskResize';
import { useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';

import {
  clearTaskScheduleDatesInList,
  resolveIssueKeyForScheduleClear,
} from './clearTaskScheduleDatesOnRemoveFromPlan';
import { handleTaskResizeAfterResize } from './sprintPlannerTaskHandlersResizeHelpers';
import { runAutoAddToSwimlane } from './useSprintPlannerTaskHandlersAutoAddHelpers';

interface UseSprintPlannerTaskHandlersProps {
  /** Задачи, QA-задачи и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  developers: Developer[];
  filteredTaskPositions?: Map<string, TaskPosition>;
  qaTaskManagement?: {
    createQATask: (devTaskId: string, qaTasksMap: Map<string, Task>, tasks: Task[]) => void;
  };
  selectedSprintId: number | null;
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
  developers,
  filteredTaskPositions,
  qaTaskManagement,
  onRequestQaEngineerPicker,
  selectedSprintId,
  sprintTimelineWorkingDays = WORKING_DAYS,
  setTasks,
  tasksMap,
  debouncedUpdateXarrow,
}: UseSprintPlannerTaskHandlersProps) {
  const { qaTasksByOriginalId, qaTasksMap, tasks } = board;
  const { deletePosition, savePosition, setPositionsWithSave: setTaskPositions } = board.positions;
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

  // Обработчик обновления позиции задачи при перетаскивании
  const handlePositionUpdate = useCallback(
    (taskId: string, position: TaskPosition, historyOptions?: PositionHistoryOptions) => {
      setTaskPositions((prev) => {
        const newPositions = new Map(prev);

        // При перетаскивании обновляем planned позиции на новые значения
        // чтобы baseline пересчитывался относительно нового плана
        const updatedPosition: TaskPosition = {
          ...position,
          plannedStartDay: position.startDay,
          plannedStartPart: position.startPart,
          plannedDuration: position.duration,
        };

        newPositions.set(taskId, updatedPosition);
        return newPositions;
      }, { recordHistory: true, ...historyOptions });

      // Определяем, является ли задача QA
      const task = tasksMap.get(taskId) || qaTasksByOriginalId.get(taskId);
      if (task?.isLocalTask) {
        return;
      }
      const isQa = task?.team === 'QA' || false;

      // Сохраняем позицию через API (асинхронно)
      if (selectedSprintId) {
        // При перетаскивании обновляем planned позиции на новые значения
        const updatedPosition: TaskPosition & { __source: string } = {
          ...position,
          plannedStartDay: position.startDay,
          plannedStartPart: position.startPart,
          plannedDuration: position.duration,
          __source: 'useSprintPlannerTaskHandlers.handlePositionUpdate',
        };
        savePosition(updatedPosition, isQa, isQa ? task?.originalTaskId : undefined).catch((error) => {
          console.error('Error saving position:', error);
        });
      }
    },
    [
      setTaskPositions,
      tasksMap,
      qaTasksByOriginalId,
      selectedSprintId,
      savePosition,
    ]
  );

  // Обработчик удаления позиции задачи (оптимистично: сначала локально, затем запрос)
  const handlePositionDelete = useCallback(
    (taskId: string) => {
      setTaskPositions((prev) => {
        const newPositions = new Map(prev);
        newPositions.delete(taskId);
        return newPositions;
      }, { recordHistory: true });
      const issueKey = resolveIssueKeyForScheduleClear(taskId, tasksMap);
      if (issueKey) {
        setTasks((prev) => clearTaskScheduleDatesInList(prev, issueKey));
      }
      deletePosition(taskId).catch((error) => {
        console.error('Error deleting position:', error);
        // При ошибке перезагрузим позиции — они подтянутся при следующем fetch
      });
    },
    [deletePosition, setTaskPositions, setTasks, tasksMap]
  );

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

  // Добавить задачу в ближайшее пустое место от начала спринта (для кнопки в сайдбаре)
  const handleAutoAddToSwimlane = useCallback(
    (task: Task) => {
      if (!selectedSprintId || !filteredTaskPositions) return;
      runAutoAddToSwimlane({
        task,
        developers,
        filteredTaskPositions,
        selectedSprintId,
        setTaskPositions,
        savePosition,
        debouncedUpdateXarrow,
        timelineTotalCells,
      });
    },
    [
      selectedSprintId,
      filteredTaskPositions,
      timelineTotalCells,
      developers,
      setTaskPositions,
      savePosition,
      debouncedUpdateXarrow,
    ]
  );

  return {
    handleAutoAddToSwimlane,
    handleCreateQATask,
    handlePositionDelete,
    handlePositionUpdate,
    handleTaskResize,
  };
}

