import type { Task, TaskPosition } from '@/types';

import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { updateIssueWorkForPhase } from '@/lib/beerTrackerApi';
import { resizeShouldPreserveEstimate } from '@/lib/plannerTimelineScale';
import { timeslotsToStoryPoints } from '@/lib/pointsUtils';

import {
  currentEstimateForResizeTask,
  issueKeyForEstimateSync,
  resolveDevTaskForResize,
} from './sprintPlannerTaskHandlersHelpers';

interface HandleTaskResizeAfterResizeParams {
  devTask: Task;
  effectiveIsQa: boolean;
  newDuration: number;
  newSP: number;
  syncEstimates: boolean;
  task: Task;
  updatedPosition: TaskPosition;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devTaskKey?: string,
    immediate?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

function applyResizeEstimateToTasks(
  setTasks: HandleTaskResizeAfterResizeParams['setTasks'],
  devTask: Task,
  effectiveIsQa: boolean,
  newSP: number
): void {
  setTasks((prev) =>
    prev.map((t) => {
      if (t.id === devTask.id) {
        return effectiveIsQa ? { ...t, testPoints: newSP } : { ...t, storyPoints: newSP };
      }
      if (effectiveIsQa && t.originalTaskId === devTask.id) {
        return { ...t, testPoints: newSP };
      }
      return t;
    })
  );
}

function syncResizeEstimateToTracker(
  devTask: Task,
  effectiveIsQa: boolean,
  newSP: number,
  syncEstimates: boolean
): void {
  if (!syncEstimates) return;
  const issueKey = issueKeyForEstimateSync(devTask, effectiveIsQa);
  updateIssueWorkForPhase(issueKey, newSP, effectiveIsQa).catch((error) => {
    console.error('Re-estimate on swimlane resize failed:', error);
  });
}

function persistResizedPosition(
  task: Task,
  effectiveIsQa: boolean,
  updatedPosition: TaskPosition,
  savePosition: HandleTaskResizeAfterResizeParams['savePosition']
): void {
  const isQaPhase = effectiveIsQa && task.team === 'QA';
  const updatedPos: TaskPosition & { __source: string } = {
    ...updatedPosition,
    __source: 'useSprintPlannerTaskHandlers.handleTaskResize',
  };
  savePosition(updatedPos, isQaPhase, isQaPhase ? task.originalTaskId : undefined).catch((error) => {
    console.error('Error saving position after swimlane resize:', error);
  });
}

function handleLocalTaskResizeOnSwimlane(
  taskId: string,
  newDuration: number,
  setTasks: HandleTaskResizeAfterResizeParams['setTasks']
): void {
  const newSP = timeslotsToStoryPoints(newDuration);
  setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, storyPoints: newSP } : t)));
}

function syncResizeEstimateIfChanged(
  devTask: Task,
  effectiveIsQa: boolean,
  currentEstimate: number | null,
  newSP: number,
  setTasks: HandleTaskResizeAfterResizeParams['setTasks'],
  syncEstimates: boolean
): void {
  if (currentEstimate === null || currentEstimate === newSP) return;
  applyResizeEstimateToTasks(setTasks, devTask, effectiveIsQa, newSP);
  syncResizeEstimateToTracker(devTask, effectiveIsQa, newSP, syncEstimates);
}

export function handleTaskResizeAfterResize(
  taskId: string,
  newDuration: number,
  updatedPosition: TaskPosition,
  tasksMap: Map<string, Task>,
  qaTasksByOriginalId: Map<string, Task>,
  setTasks: HandleTaskResizeAfterResizeParams['setTasks'],
  syncEstimates: boolean,
  savePosition: HandleTaskResizeAfterResizeParams['savePosition'],
  previousDuration: number | null
): void {
  const task = tasksMap.get(taskId) || qaTasksByOriginalId.get(taskId);
  if (!task) return;

  if (task.isLocalTask) {
    if (
      resizeShouldPreserveEstimate({
        currentEstimate: task.storyPoints ?? 0,
        previousDuration,
      })
    ) {
      return;
    }
    handleLocalTaskResizeOnSwimlane(taskId, newDuration, setTasks);
    return;
  }

  const effectiveIsQa = isEffectivelyQaTask(task);
  const devTask = resolveDevTaskForResize(task, tasksMap);
  const currentEstimate = currentEstimateForResizeTask(devTask, effectiveIsQa);
  const newSP = timeslotsToStoryPoints(newDuration);
  const preserveEstimate =
    currentEstimate != null &&
    resizeShouldPreserveEstimate({ currentEstimate, previousDuration });

  if (devTask && !preserveEstimate) {
    syncResizeEstimateIfChanged(
      devTask,
      effectiveIsQa,
      currentEstimate,
      newSP,
      setTasks,
      syncEstimates
    );
  }

  persistResizedPosition(task, effectiveIsQa, updatedPosition, savePosition);
}
