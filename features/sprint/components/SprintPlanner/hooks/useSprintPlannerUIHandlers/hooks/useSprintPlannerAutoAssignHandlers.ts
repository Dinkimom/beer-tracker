/**
 * Хук для обработчиков автоматической расстановки задач в SprintPlanner
 */

import type { DevelopersManagement } from '@/features/sprint/hooks/useDevelopersManagement';
import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { Task, TaskPosition } from '@/types';

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
  /** QA-задачи и связи — из модели доски в момент расстановки. */
  board: SprintBoard;
  developersManagement: DevelopersManagement;
  /** Праздничные дни таймлайна: расстановка их пропускает. */
  holidayDayIndices: ReadonlySet<number>;
  resetDragStateRef: MutableRefObject<(() => void) | null>;
  selectedSprintId: number | null;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  taskPositions: Map<string, TaskPosition>;
  tasksMap: Map<string, Task>;
  confirm: (message: string, options?: {
    title?: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
  debouncedUpdateXarrow: () => void;
  savePosition: (position: TaskPosition, isQa: boolean) => Promise<void>;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
}

export function useSprintPlannerAutoAssignHandlers({
  allTasksForDrag,
  board,
  developersManagement,
  holidayDayIndices,
  resetDragStateRef,
  selectedSprintId,
  setTaskPositions,
  sprintStartDate,
  sprintTimelineWorkingDays,
  taskPositions,
  tasksMap,
  confirm,
  debouncedUpdateXarrow,
}: UseSprintPlannerAutoAssignHandlersProps) {
  const { setWithSave: setTaskLinks } = board.links;
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

    const partsPerDay = getPartsPerDay();
    const currentCell = getCurrentSprintCell(sprintStartDate, partsPerDay, sprintTimelineWorkingDays);
    const result = autoAssignTasks(
      allTasksForDrag,
      developersManagement.sortedDevelopers,
      new Map(),
      board.qaTasksMap,
      [],
      currentCell,
      Math.max(1, sprintTimelineWorkingDays) * partsPerDay,
      holidayDayIndices
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
        qaTasksByOriginalId: board.qaTasksByOriginalId,
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
    sprintTimelineWorkingDays,
    allTasksForDrag,
    developersManagement.sortedDevelopers,
    holidayDayIndices,
    board,
    tasksMap,
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

