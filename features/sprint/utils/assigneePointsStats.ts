/**
 * Запланированные SP/TP по исполнителям по позициям на доске.
 * Формула совпадает с useSwimlaneLayout: для каждой карточки на строке исполнителя
 * в сумму входят и story points, и test points этой задачи (как в заголовке строки свимлейна).
 */

import type { Task, TaskPosition } from '@/types';

import {
  getTaskStoryPoints,
  getTaskTestPoints,
  shouldCountTaskForParticipantVolume,
} from '@/lib/pointsUtils';

export interface AssigneePointsStats {
  byAssignee: Map<
    string,
    { storyPoints: number; testPoints: number }
  >;
  totalStoryPoints: number;
  totalTestPoints: number;
}

export function computeAssigneePointsStats(
  taskPositions: Map<string, TaskPosition>,
  tasksMap: Map<string, Task>
): AssigneePointsStats {
  const byAssignee = new Map<string, { storyPoints: number; testPoints: number }>();
  let totalStoryPoints = 0;
  let totalTestPoints = 0;

  // Каждая карточка на строке исполнителя вносит и SP, и TP (как useSwimlaneLayout: totalSP + totalTP)
  taskPositions.forEach((position, taskId) => {
    const task = tasksMap.get(taskId);
    if (!task || !shouldCountTaskForParticipantVolume(task)) return;

    const entry = byAssignee.get(position.assignee) ?? { storyPoints: 0, testPoints: 0 };
    const sp = getTaskStoryPoints(task);
    const tp = getTaskTestPoints(task);
    entry.storyPoints += sp;
    entry.testPoints += tp;
    totalStoryPoints += sp;
    totalTestPoints += tp;
    byAssignee.set(position.assignee, entry);
  });

  return {
    byAssignee,
    totalStoryPoints,
    totalTestPoints,
  };
}
