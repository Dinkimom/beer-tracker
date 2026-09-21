/**
 * Хук для обработчиков операций с задачами в SprintPlanner
 */

import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Developer, Task, TaskPosition } from '@/types';

import { useCallback } from 'react';

import { PARTS_PER_DAY, WORKING_DAYS } from '@/constants';
import { useTaskResize } from '@/features/task/hooks/useTaskResize';
import { useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';

import { handleTaskResizeAfterResize } from './sprintPlannerTaskHandlersResizeHelpers';
import { runAutoAddToSwimlane } from './useSprintPlannerTaskHandlersAutoAddHelpers';
import {
  applyBacklogTaskDropToState,
  buildBacklogDropPosition,
  finalizeBacklogTaskDrop,
} from './useSprintPlannerTaskHandlersBacklogHelpers';

interface UseSprintPlannerTaskHandlersProps {
  backlogTaskRef: React.MutableRefObject<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>;
  developers: Developer[];
  filteredTaskPositions?: Map<string, TaskPosition>;
  qaTaskManagement?: {
    createQATask: (devTaskId: string, qaTasksMap: Map<string, Task>, tasks: Task[]) => void;
  };
  qaTasksByOriginalId: Map<string, Task>;
  qaTasksMap: Map<string, Task>;
  selectedSprintId: number | null;
  slaBugsTasks?: Task[];
  /** Рабочих дней в таймлайне (длина спринта) */
  sprintTimelineWorkingDays?: number;
  tasks: Task[];
  tasksMap: Map<string, Task>;
  debouncedUpdateXarrow: () => void;
  deletePosition: (taskId: string, options?: { recordHistory?: boolean }) => Promise<void>;
  /** Нет qaEngineer на dev-задаче — открыть пикер QA (anchor с кнопки +) */
  onRequestQaEngineerPicker?: (devTaskId: string, anchorRect: DOMRect) => void;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devTaskKey?: string,
    immediate?: boolean,
    options?: PositionHistoryOptions
  ) => Promise<void>;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options?: PositionHistoryOptions
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function useSprintPlannerTaskHandlers({
  backlogTaskRef,
  slaBugsTasks = [],
  developers,
  filteredTaskPositions,
  qaTaskManagement,
  onRequestQaEngineerPicker,
  qaTasksByOriginalId,
  qaTasksMap,
  selectedSprintId,
  sprintTimelineWorkingDays = WORKING_DAYS,
  setTaskPositions,
  setTasks,
  tasks,
  tasksMap,
  debouncedUpdateXarrow,
  deletePosition,
  savePosition,
}: UseSprintPlannerTaskHandlersProps) {
  const [syncEstimates] = useDataSyncEstimatesStorage();
  // Хук для обработки изменения размера задач
  const timelineTotalCells = sprintTimelineWorkingDays * PARTS_PER_DAY;
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

  // Обработчик перетаскивания задачи из бэклога на свимлейн
  const handleBacklogTaskDrop = useCallback(
    (
      taskId: string,
      assigneeId: string,
      day: number,
      part: number,
      historyOptions?: PositionHistoryOptions
    ) => {
      if (!selectedSprintId) {
        return;
      }

      const sidebarTask =
        backlogTaskRef.current?.getTask(taskId) ?? slaBugsTasks.find((task) => task.id === taskId);
      if (!sidebarTask) {
        return;
      }

      applyBacklogTaskDropToState({
        assigneeId,
        buildBacklogDropPosition,
        day,
        historyOptions,
        part,
        savePosition,
        setTaskPositions,
        setTasks,
        sidebarTask,
        taskId,
      });

      finalizeBacklogTaskDrop({
        backlogTaskRef,
        debouncedUpdateXarrow,
        selectedSprintId,
        taskId,
      });
    },
    [selectedSprintId, setTasks, setTaskPositions, savePosition, debouncedUpdateXarrow, backlogTaskRef, slaBugsTasks]
  );

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
      deletePosition(taskId).catch((error) => {
        console.error('Error deleting position:', error);
        // При ошибке перезагрузим позиции — они подтянутся при следующем fetch
      });
    },
    [setTaskPositions, deletePosition]
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
      });
    },
    [
      selectedSprintId,
      filteredTaskPositions,
      developers,
      setTaskPositions,
      savePosition,
      debouncedUpdateXarrow,
    ]
  );

  return {
    handleAutoAddToSwimlane,
    handleBacklogTaskDrop,
    handleCreateQATask,
    handlePositionDelete,
    handlePositionUpdate,
    handleTaskResize,
  };
}

