import type { OccupancyTaskLink } from './occupancyTaskArrowsHelpers';
import type { TaskPosition } from '@/types';

import { resolveLinkArrowDrawTaskIds } from '@/utils/linkAnchors';

import { resolveOccupancyArrowTaskIds } from './occupancyTaskArrowsTaskIdHelpers';

/** DOM id полосы фазы (совпадает с `htmlAnchorId` у OccupancyPhaseBar). */
export function getOccupancyPhaseBarHtmlAnchorId(taskId: string): string {
  return `occupancy-phase-${taskId}`;
}

/**
 * DOM id отрезка плана на занятости (как `getSwimlanePlanSegmentHtmlAnchorId`).
 * Первый отрезок и одиночная полоса — `occupancy-phase-${taskId}`;
 * остальные — `occupancy-phase-${taskId}-seg-${segIdx}`.
 */
export function getOccupancyPlanSegmentHtmlAnchorId(taskId: string, segIdx: number): string {
  return segIdx > 0 ? `occupancy-phase-${taskId}-seg-${segIdx}` : getOccupancyPhaseBarHtmlAnchorId(taskId);
}

export function resolveOccupancyArrowEndpointLayout(input: {
  isDevQALink: boolean;
  link: OccupancyTaskLink;
  taskIdsOrder: string[];
  taskPositions: Map<string, TaskPosition>;
  getRowTaskIds: (taskId: string) => string[];
}): {
  arrowEndTaskId: string;
  arrowStartTaskId: string;
  endElement: string;
  startElement: string;
} {
  const { startTaskId: earlierTaskId, endTaskId: laterTaskId } = resolveLinkArrowDrawTaskIds(
    input.link.fromTaskId,
    input.link.toTaskId,
    input.taskPositions,
    input.isDevQALink
  );

  const { arrowEndTaskId, arrowStartTaskId } = resolveOccupancyArrowTaskIds({
    earlierTaskId,
    getRowTaskIds: input.getRowTaskIds,
    isDevQALink: input.isDevQALink,
    laterTaskId,
    linkFromTaskId: input.link.fromTaskId,
    linkToTaskId: input.link.toTaskId,
    taskPositions: input.taskPositions,
  });

  return {
    arrowEndTaskId,
    arrowStartTaskId,
    startElement: getOccupancyPhaseBarHtmlAnchorId(arrowStartTaskId),
    endElement: getOccupancyPhaseBarHtmlAnchorId(arrowEndTaskId),
  };
}
