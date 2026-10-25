/**
 * Размещение QA-фазы на свимлейне: одно правило для кнопки «+QA», пикера QA и авторасстановки.
 */

import type { TimeInterval } from '@/features/task/utils/autoAssignTasks/types';
import type { Task, TaskPosition } from '@/types';
import type { Developer } from '@/types';

import { getPartsPerDay } from '@/constants';
import { findFirstFreeCell } from '@/features/task/utils/autoAssignTasks/utils/intervalUtils';
import { positionToEndCell } from '@/lib/planner-timeline';
import { getTaskPoints, storyPointsToTimeslots } from '@/lib/pointsUtils';
import { getQALinkAnchors } from '@/utils/linkAnchors';

/** Длина QA-фазы: тест-поинты через шкалу организации, как SP у dev-фазы. */
export function qaPhaseDurationSlots(qaTask: Task): number {
  return Math.max(1, storyPointsToTimeslots(getTaskPoints(qaTask)));
}

/**
 * Позиция QA-фазы или null, если её нельзя поставить.
 * - длина — `qaPhaseDurationSlots`;
 * - старт не раньше конца последнего отрезка dev-карточки (и не раньше `minStartCell`);
 * - первое свободное окно в строке QA (`laneIntervals`);
 * - карточка целиком внутри спринта (`totalCells`), иначе null.
 */
export function placeQaPhase(input: {
  devPosition: TaskPosition;
  laneIntervals: readonly TimeInterval[];
  minStartCell?: number;
  qaTask: Task;
  totalCells: number;
}): TaskPosition | null {
  const assignee = input.qaTask.assignee;
  if (!assignee) {
    return null;
  }
  const duration = qaPhaseDurationSlots(input.qaTask);
  const minStart = Math.max(positionToEndCell(input.devPosition), input.minStartCell ?? 0);
  const startCell = findFirstFreeCell(input.laneIntervals, duration, minStart, input.totalCells);
  if (startCell === null) {
    return null;
  }
  const startDay = Math.floor(startCell / getPartsPerDay());
  const startPart = startCell % getPartsPerDay();
  return {
    taskId: input.qaTask.id,
    assignee,
    startDay,
    startPart,
    duration,
    plannedStartDay: startDay,
    plannedStartPart: startPart,
    plannedDuration: duration,
  };
}

/**
 * Вычисляет якоря для связи между dev и QA задачами
 */
export function calculateQATaskLinkAnchors(
  devTask: Task,
  devTaskPosition: TaskPosition,
  qaTask: Task,
  qaTaskPosition: TaskPosition,
  developers: Developer[]
): { fromAnchor: 'bottom' | 'left' | 'right' | 'top'; toAnchor: 'bottom' | 'left' | 'right' | 'top' } {
  // Определяем якоря для стрелки на основе позиции QA задачи
  return getQALinkAnchors(devTask, devTaskPosition, qaTask, qaTaskPosition, developers);
}
