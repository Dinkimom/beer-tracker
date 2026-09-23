/**
 * Хук для обработчиков автоматической расстановки задач в SprintPlanner
 */

import type { Developer, Task, TaskPosition } from '@/types';

import { useCallback, type MutableRefObject } from 'react';

import { getPartsPerDay } from '@/constants';
import { autoAssignTasks } from '@/features/task/utils/autoAssignTasks';
import {
  clearSprintPositions,
  clearSprintLinks,
  saveTaskPositionsBatch,
  saveTaskLinksBatch,
} from '@/lib/beerTrackerApi';
import { DELAYS } from '@/utils/constants';
import { getCurrentSprintCell } from '@/utils/dateUtils';

import { buildAutoAssignBatchPayload } from '../../useSprintPlannerAutoAssignBatchHelpers';
import {
  confirmAutoAssignIfNeeded,
  saveAutoAssignBatch,
} from '../../useSprintPlannerAutoAssignRunHelpers';

interface UseSprintPlannerAutoAssignHandlersProps {
  allTasksForDrag: Task[];
  developersManagement: {
    sortedDevelopers: Developer[];
  };
  qaTasksByOriginalId: Map<string, Task>;
  qaTasksMap: Map<string, Task>;
  resetDragStateRef: MutableRefObject<(() => void) | null>;
  selectedSprintId: number | null;
  sprintStartDate: Date;
  taskPositions: Map<string, TaskPosition>;
  tasksMap: Map<string, Task>;
  confirm: (message: string, options?: {
    title?: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
  debouncedUpdateXarrow: () => void;
  saveLink: (link: { fromTaskId: string; toTaskId: string; id: string }) => Promise<void>;
  savePosition: (position: TaskPosition, isQa: boolean) => Promise<void>;
  setTaskLinks: (updater: (prev: Array<{
    fromTaskId: string;
    toTaskId: string;
    id: string;
  }>) => Array<{
    fromTaskId: string;
    toTaskId: string;
    id: string;
  }>) => void;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
}

export function useSprintPlannerAutoAssignHandlers({
  allTasksForDrag,
  developersManagement,
  resetDragStateRef,
  qaTasksByOriginalId,
  qaTasksMap,
  selectedSprintId,
  setTaskLinks,
  setTaskPositions,
  sprintStartDate,
  taskPositions,
  tasksMap,
  confirm,
  debouncedUpdateXarrow,
}: UseSprintPlannerAutoAssignHandlersProps) {
  const handleAutoAssignTasks = useCallback(async () => {
    const confirmed = await confirmAutoAssignIfNeeded({
      confirm,
      taskPositionsCount: taskPositions.size,
    });
    if (!confirmed) {
      return;
    }

    if (!selectedSprintId) {
      return;
    }

    setTaskPositions(() => new Map());
    setTaskLinks(() => []);

    const currentCell = getCurrentSprintCell(sprintStartDate, getPartsPerDay());
    const result = autoAssignTasks(
      allTasksForDrag,
      developersManagement.sortedDevelopers,
      new Map(),
      qaTasksMap,
      [],
      currentCell
    );

    setTaskPositions(() => result.positions);
    setTaskLinks(() => result.links as Array<{
      fromTaskId: string;
      toTaskId: string;
      id: string;
    }>);

    try {
      const { positionsArray, linksArray } = buildAutoAssignBatchPayload({
        positions: result.positions,
        links: result.links,
        qaTasksByOriginalId,
        tasksMap,
      });

      await saveAutoAssignBatch({
        linksArray,
        positionsArray,
        selectedSprintId,
        saveTaskLinksBatch: saveTaskLinksBatch as (
          sprintId: number,
          links: Array<Record<string, unknown>>
        ) => Promise<unknown>,
        saveTaskPositionsBatch: saveTaskPositionsBatch as (
          sprintId: number,
          positions: Array<Record<string, unknown>>
        ) => Promise<unknown>,
      });
    } catch (error) {
      console.error('Error saving auto-assigned positions and links:', error);
    }

    setTimeout(() => debouncedUpdateXarrow(), DELAYS.ARROW_UPDATE);
  }, [
    confirm,
    taskPositions.size,
    selectedSprintId,
    setTaskPositions,
    setTaskLinks,
    sprintStartDate,
    allTasksForDrag,
    developersManagement.sortedDevelopers,
    qaTasksMap,
    tasksMap,
    qaTasksByOriginalId,
    debouncedUpdateXarrow,
  ]);

  const handleReturnAllTasks = useCallback(
    async () => {
      if (!selectedSprintId) return;

      resetDragStateRef.current?.();

      setTaskPositions(() => new Map());
      setTaskLinks(() => []);

      try {
        await Promise.all([
          clearSprintPositions(selectedSprintId),
          clearSprintLinks(selectedSprintId),
        ]);
      } catch (error) {
        console.error('Error clearing positions and links:', error);
      }

      setTimeout(() => debouncedUpdateXarrow(), DELAYS.ARROW_UPDATE);
    },
    [selectedSprintId, resetDragStateRef, setTaskPositions, setTaskLinks, debouncedUpdateXarrow]
  );

  return {
    handleAutoAssignTasks,
    handleReturnAllTasks,
  };
}

