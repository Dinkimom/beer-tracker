/**
 * Утилиты для размещения QA задач на swimlane
 */

import type { Task, TaskPosition } from '@/types';
import type { Developer } from '@/types';

import { WORKING_DAYS, PARTS_PER_DAY } from '@/constants';
import { getQALinkAnchors } from '@/utils/linkAnchors';

/**
 * Размещает QA задачу на swimlane после задачи разработки
 */
export function calculateQATaskPosition(
  qaTask: Task,
  devTask: Task,
  devTaskPosition: TaskPosition,
  taskPositions: Map<string, TaskPosition>,
  allTasks: Task[]
): TaskPosition {
  // Вычисляем позицию для QA задачи - после задачи разработки
  const devTaskEndCell = (devTaskPosition.startDay * PARTS_PER_DAY + devTaskPosition.startPart) + devTaskPosition.duration;
  const qaTaskDuration = qaTask.testPoints || 1;

  // Находим все задачи QA инженера (используем assignee из QA задачи)
  const qaEngineerId = qaTask.assignee;
  if (!qaEngineerId) {
    throw new Error('QA задача не имеет assignee');
  }

  const qaEngineerTasks = Array.from(taskPositions.entries())
    .filter(([taskId]) => {
      const task = allTasks.find(t => t.id === taskId);
      return task && task.assignee === qaEngineerId && task.team === 'QA';
    })
    .map(([taskId, pos]) => ({
      taskId,
      position: pos,
      endCell: (pos.startDay * PARTS_PER_DAY + pos.startPart) + pos.duration,
    }))
    .sort((a, b) => a.endCell - b.endCell);

  // Вычисляем позицию после всех существующих задач QA или после задачи разработки
  let targetStartCell = devTaskEndCell;
  if (qaEngineerTasks.length > 0) {
    const lastQATaskEnd = qaEngineerTasks[qaEngineerTasks.length - 1].endCell;
    targetStartCell = Math.max(devTaskEndCell, lastQATaskEnd);
  }

  // Проверяем границы
  const maxStart = WORKING_DAYS * PARTS_PER_DAY - qaTaskDuration;
  if (targetStartCell > maxStart) {
    targetStartCell = maxStart;
  }

  if (targetStartCell < 0) {
    targetStartCell = 0;
  }

  const targetDay = Math.floor(targetStartCell / PARTS_PER_DAY);
  const targetPart = targetStartCell % PARTS_PER_DAY;

  return {
    taskId: qaTask.id,
    assignee: qaEngineerId,
    startDay: targetDay,
    startPart: targetPart,
    duration: qaTaskDuration,
    plannedStartDay: targetDay,
    plannedStartPart: targetPart,
    plannedDuration: qaTaskDuration,
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
