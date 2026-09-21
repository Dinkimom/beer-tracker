import type { PhaseSegment, Task, TaskPosition } from '@/types';

import { useCallback } from 'react';

import { updateIssueWorkForPhase } from '@/lib/beerTrackerApi';
import { useRootStore } from '@/lib/layers';

import {
  applyEstimateToTasks,
  buildPositionFromSegments,
  resolveCurrentEstimate,
  resolveDevTaskForPositionSave,
  resolveEffectiveIsQa,
  resolveNewStoryPointsFromPosition,
  resolveResizeIssueKey,
  shouldSyncEstimateOnResize,
} from './useSprintPlannerEstimateHandlersHelpers';

interface UseSprintPlannerEstimateHandlersParams {
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  syncEstimates: boolean;
  tasksMap: Map<string, Task>;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devKey?: string,
    force?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
}

/**
 * Оценки (SP/TP), сохранение позиций при ресайзе фаз и редактор отрезков.
 */
export function useSprintPlannerEstimateHandlers({
  savePosition,
  setTasks,
  syncEstimates,
  tasksMap,
}: UseSprintPlannerEstimateHandlersParams) {
  const { sprintPlannerUi } = useRootStore();

  const handleUpdateEstimate = useCallback(
    (task: Task, newEstimate: number, isTestPoints: boolean) => {
      setTasks((prevTasks) => applyEstimateToTasks(prevTasks, task, newEstimate, isTestPoints));
    },
    [setTasks]
  );

  const handleSplitPhaseIntoSegments = useCallback(
    (task: Task) => {
      sprintPlannerUi.setContextMenu(null);
      sprintPlannerUi.setContextMenuTaskId(null);
      sprintPlannerUi.setSegmentEditTaskId(task.id);
    },
    [sprintPlannerUi]
  );

  const handleOccupancyPositionSave = useCallback(
    async (position: TaskPosition, isQa: boolean, devKey?: string) => {
      const fromSegmentEditor =
        (position as unknown as { __source?: string }).__source === 'SprintPlanner.onSegmentEditSave';

      const taskByPosition = tasksMap.get(position.taskId);
      const effectiveIsQa = resolveEffectiveIsQa(isQa, taskByPosition);
      const devTask = resolveDevTaskForPositionSave(position, effectiveIsQa, devKey, tasksMap);
      const currentEstimate = devTask ? resolveCurrentEstimate(devTask, effectiveIsQa) : null;
      const newSP = resolveNewStoryPointsFromPosition(position);

      if (shouldSyncEstimateOnResize(syncEstimates, fromSegmentEditor, devTask, currentEstimate, newSP)) {
        handleUpdateEstimate(devTask!, newSP, effectiveIsQa);
        updateIssueWorkForPhase(resolveResizeIssueKey(position, effectiveIsQa, devKey), newSP, effectiveIsQa).catch(
          (err) => console.error('Re-estimate on resize failed:', err)
        );
      }

      const positionWithSource = {
        ...position,
        __source: (position as unknown as { __source?: string }).__source ?? 'SprintPlanner.handleOccupancyPositionSave',
      } as TaskPosition & { __source: string };

      await savePosition(positionWithSource, isQa, devKey, true, { recordHistory: true });
    },
    [tasksMap, handleUpdateEstimate, savePosition, syncEstimates]
  );

  const handleSegmentEditSave = useCallback(
    (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => {
      const task = tasksMap.get(position.taskId);
      const positionFromSegments = buildPositionFromSegments(position, segments);
      const devKey = isQa && task?.team === 'QA' ? (task.originalTaskId ?? undefined) : undefined;
      void handleOccupancyPositionSave(positionFromSegments, isQa, devKey);
    },
    [tasksMap, handleOccupancyPositionSave]
  );

  return {
    handleOccupancyPositionSave,
    handleSegmentEditSave,
    handleSplitPhaseIntoSegments,
    handleUpdateEstimate,
  };
}
