import type { Task } from '@/types';

export function resolveOccupancyLinkBlockRowFlags(input: {
  linkingFromTaskId: string | null;
  qaTask?: Task;
  task: Task;
  validTargetByTime: boolean;
  linkAlreadyExistsFromSource: boolean;
}) {
  const rowIsLinkSource =
    input.linkingFromTaskId === input.task.id ||
    (input.qaTask != null && input.linkingFromTaskId === input.qaTask.id);
  const rowIsLinkTarget =
    input.validTargetByTime &&
    !input.linkAlreadyExistsFromSource &&
    input.linkingFromTaskId !== input.task.id &&
    (input.qaTask == null || input.linkingFromTaskId !== input.qaTask.id);
  return { rowIsLinkSource, rowIsLinkTarget };
}

export function resolveOccupancyLinkOutlineVisibility(input: {
  isHoveringThisRowPhase: boolean;
  rowIsLinkSource: boolean;
  rowIsLinkTarget: boolean;
}): { showSourceRing: boolean; showTargetHover: boolean } {
  return {
    showSourceRing: input.rowIsLinkSource,
    showTargetHover: input.rowIsLinkTarget && input.isHoveringThisRowPhase,
  };
}

export function isOccupancyLinkBlockHoveringRow(input: {
  hoveredPhaseTaskId: string | null;
  qaTask?: Task;
  task: Task;
}) {
  return (
    input.hoveredPhaseTaskId === input.task.id ||
    (input.qaTask != null && input.hoveredPhaseTaskId === input.qaTask.id)
  );
}

export function buildOccupancyLinkBlockStyle(input: {
  combinedLeftPercent: number;
  combinedRightPercent: number;
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  phaseInsetPx: number;
}) {
  return {
    left: `calc(${input.combinedLeftPercent}% + ${input.phaseInsetPx}px)` as const,
    right: `calc(${100 - input.combinedRightPercent}% + ${input.phaseInsetPx}px)` as const,
    top: input.phaseBarTopOffsetPx,
    height: input.phaseBarHeightPx,
  };
}
