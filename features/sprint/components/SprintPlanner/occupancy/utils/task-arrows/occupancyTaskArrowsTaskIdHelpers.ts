import type { TaskPosition } from '@/types';

import {
  findLeftmostTaskIdInRow,
  findRightmostTaskIdInRow,
} from './occupancyTaskArrowsExtremumHelpers';

export function resolveOccupancyArrowTaskIds(input: {
  earlierTaskId: string;
  getRowTaskIds: (taskId: string) => string[];
  isDevQALink: boolean;
  laterTaskId: string;
  linkFromTaskId: string;
  linkToTaskId: string;
  taskPositions: Map<string, TaskPosition>;
}): { arrowEndTaskId: string; arrowStartTaskId: string } {
  if (input.isDevQALink) {
    return { arrowStartTaskId: input.linkFromTaskId, arrowEndTaskId: input.linkToTaskId };
  }
  const earlierRowIds = input.getRowTaskIds(input.earlierTaskId);
  const laterRowIds = input.getRowTaskIds(input.laterTaskId);
  return {
    arrowStartTaskId:
      findRightmostTaskIdInRow(earlierRowIds, input.taskPositions) ?? input.earlierTaskId,
    arrowEndTaskId:
      findLeftmostTaskIdInRow(laterRowIds, input.taskPositions) ?? input.laterTaskId,
  };
}
