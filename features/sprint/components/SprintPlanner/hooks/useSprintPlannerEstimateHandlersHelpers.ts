import type { PhaseSegment, Task, TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { getSegmentEditorRangeAndCells } from '@/features/sprint/utils/occupancyUtils';
import { getTaskPoints, isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { timeslotsToStoryPoints } from '@/lib/pointsUtils';

export function applyEstimateToTasks(
  prevTasks: Task[],
  task: Task,
  newEstimate: number,
  isTestPoints: boolean
): Task[] {
  const targetId = isTestPoints && task.originalTaskId ? task.originalTaskId : task.id;
  return prevTasks.map((t) => {
    if (t.id === targetId) {
      return { ...t, ...(isTestPoints ? { testPoints: newEstimate } : { storyPoints: newEstimate }) };
    }
    if (isTestPoints && t.originalTaskId === targetId) {
      return { ...t, testPoints: newEstimate };
    }
    return t;
  });
}

export function resolveEffectiveIsQa(
  isQa: boolean,
  taskByPosition: Task | undefined
): boolean {
  return isQa || !!(taskByPosition && isEffectivelyQaTask(taskByPosition));
}

export function resolveDevTaskForPositionSave(
  position: TaskPosition,
  effectiveIsQa: boolean,
  devKey: string | undefined,
  tasksMap: Map<string, Task>
): Task | undefined {
  if (effectiveIsQa && devKey) return tasksMap.get(devKey);
  return tasksMap.get(position.taskId);
}

export function shouldSyncEstimateOnResize(
  syncEstimates: boolean,
  fromSegmentEditor: boolean,
  devTask: Task | undefined,
  currentEstimate: number | null,
  newSP: number
): boolean {
  return (
    syncEstimates &&
    !fromSegmentEditor &&
    devTask != null &&
    currentEstimate !== null &&
    newSP !== currentEstimate
  );
}

export function buildPositionFromSegments(
  position: TaskPosition,
  segments: PhaseSegment[]
): TaskPosition & { __source: string } {
  if (segments.length === 0) {
    const { rangeStartCell, totalCells } = getSegmentEditorRangeAndCells(position);
    return {
      ...position,
      segments: [],
      startDay: Math.floor(rangeStartCell / PARTS_PER_DAY),
      startPart: rangeStartCell % PARTS_PER_DAY,
      duration: totalCells,
      __source: 'SprintPlanner.onSegmentEditSave',
    };
  }

  const effectiveDuration = segments.reduce((s, seg) => s + seg.duration, 0);
  return {
    ...position,
    segments,
    duration: effectiveDuration,
    __source: 'SprintPlanner.onSegmentEditSave',
  };
}

export function resolveCurrentEstimate(devTask: Task, effectiveIsQa: boolean): number {
  return effectiveIsQa ? (devTask.testPoints ?? 0) : getTaskPoints(devTask);
}

export function resolveResizeIssueKey(
  position: TaskPosition,
  effectiveIsQa: boolean,
  devKey: string | undefined
): string {
  return effectiveIsQa && devKey ? devKey : position.taskId;
}

export function resolveNewStoryPointsFromPosition(position: TaskPosition): number {
  return timeslotsToStoryPoints(position.duration);
}
