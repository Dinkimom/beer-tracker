/**
 * Вспомогательные функции для размещения QA задач
 */

import type { TimeInterval } from '../types';
import type { Task, TaskPosition, TaskLink, Developer } from '@/types';

import { getPartsPerDay } from '@/constants';
import { placeQaPhase } from '@/features/qa/utils/qaTaskPlacement';
import { getQALinkAnchors } from '@/utils/linkAnchors';

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
  currentCell: number,
  totalCells: number,
  holidays: readonly TimeInterval[]
): { link: TaskLink; position: TaskPosition } | null {
  const qaEngineerId = qaTask.assignee;
  if (!qaEngineerId) {
    return null;
  }

  const qaEngineerIntervals = occupiedIntervals.get(qaEngineerId) || [];
  const qaPosition = placeQaPhase({
    devPosition,
    laneIntervals: [...qaEngineerIntervals, ...holidays],
    minStartCell: currentCell,
    qaTask,
    totalCells,
  });
  if (!qaPosition) {
    return null;
  }

  const targetStartCell = qaPosition.startDay * getPartsPerDay() + qaPosition.startPart;
  qaEngineerIntervals.push({ start: targetStartCell, end: targetStartCell + qaPosition.duration });
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
  currentCell: number,
  totalCells: number,
  holidays: readonly TimeInterval[] = []
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
    currentCell,
    totalCells,
    holidays
  );
  if (!placement) {
    return;
  }

  newPositions.set(qaTask.id, placement.position);
  newLinks.push(placement.link);
}
