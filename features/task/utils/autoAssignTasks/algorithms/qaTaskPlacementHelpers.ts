/**
 * Вспомогательные функции для размещения QA задач
 */

import type { TimeInterval } from '../types';
import type { Task, TaskPosition, TaskLink, Developer } from '@/types';

import { PARTS_PER_DAY } from '@/constants';

import { findQATaskPlacement } from '../utils/intervalUtils';
import { getQALinkAnchors } from '../utils/linkUtils';

function ensureQaLinkForPlacedTask(
  devTask: Task,
  devPosition: TaskPosition,
  qaTask: Task,
  qaPosition: TaskPosition,
  developers: Developer[],
  existingLinks: TaskLink[]
): TaskLink | null {
  const existingLink = existingLinks.find(
    (link) => link.fromTaskId === devTask.id && link.toTaskId === qaTask.id
  );
  if (existingLink) {
    return null;
  }

  const anchors = getQALinkAnchors(devTask, devPosition, qaTask, qaPosition, developers);
  return {
    id: `link-qa-${devTask.id}-${qaTask.id}-${Date.now()}`,
    fromTaskId: devTask.id,
    toTaskId: qaTask.id,
    fromAnchor: anchors.fromAnchor,
    toAnchor: anchors.toAnchor,
  };
}

function placeNewQaTask(
  devTask: Task,
  devPosition: TaskPosition,
  qaTask: Task,
  developers: Developer[],
  occupiedIntervals: Map<string, TimeInterval[]>,
  currentCell: number
): { link: TaskLink; position: TaskPosition } | null {
  const qaEngineerId = qaTask.assignee;
  if (!qaEngineerId) {
    return null;
  }

  const qaTaskDuration = qaTask.testPoints || 1;
  const devTaskEndCell =
    devPosition.startDay * PARTS_PER_DAY + devPosition.startPart + devPosition.duration;
  const minStartCell = Math.max(devTaskEndCell, currentCell);
  const qaEngineerIntervals = occupiedIntervals.get(qaEngineerId) || [];
  const targetStartCell = findQATaskPlacement(qaEngineerIntervals, qaTaskDuration, minStartCell);

  if (targetStartCell === null) {
    return null;
  }

  const targetDay = Math.floor(targetStartCell / PARTS_PER_DAY);
  const targetPart = targetStartCell % PARTS_PER_DAY;
  const qaPosition: TaskPosition = {
    taskId: qaTask.id,
    assignee: qaEngineerId,
    startDay: targetDay,
    startPart: targetPart,
    duration: qaTaskDuration,
    plannedStartDay: targetDay,
    plannedStartPart: targetPart,
    plannedDuration: qaTaskDuration,
  };

  qaEngineerIntervals.push({ start: targetStartCell, end: targetStartCell + qaTaskDuration });
  occupiedIntervals.set(qaEngineerId, qaEngineerIntervals);

  const anchors = getQALinkAnchors(devTask, devPosition, qaTask, qaPosition, developers);
  return {
    position: qaPosition,
    link: {
      id: `link-qa-${devTask.id}-${qaTask.id}-${Date.now()}`,
      fromTaskId: devTask.id,
      toTaskId: qaTask.id,
      fromAnchor: anchors.fromAnchor,
      toAnchor: anchors.toAnchor,
    },
  };
}

export function placeQaTaskForDevTask(
  devTask: Task,
  devPosition: TaskPosition,
  qaTask: Task,
  developers: Developer[],
  newPositions: Map<string, TaskPosition>,
  newLinks: TaskLink[],
  occupiedIntervals: Map<string, TimeInterval[]>,
  currentCell: number
): void {
  const existingQaPosition = newPositions.get(qaTask.id);
  if (existingQaPosition) {
    const link = ensureQaLinkForPlacedTask(
      devTask,
      devPosition,
      qaTask,
      existingQaPosition,
      developers,
      newLinks
    );
    if (link) {
      newLinks.push(link);
    }
    return;
  }

  const placement = placeNewQaTask(
    devTask,
    devPosition,
    qaTask,
    developers,
    occupiedIntervals,
    currentCell
  );
  if (!placement) {
    return;
  }

  newPositions.set(qaTask.id, placement.position);
  newLinks.push(placement.link);
}
