import type { Task } from '@/types';

import {
  compareTasksByPriorityAndSize,
  isTaskEligibleForAutoAssign,
} from './taskUtilsHelpers';

/**
 * Сортирует задачи: сначала по приоритету (высший приоритет первым), затем по размеру (большие первыми)
 */
export function sortTasksByPriorityAndSize(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasksByPriorityAndSize);
}

/**
 * Фильтрует неназначенные задачи для автоматической расстановки
 */
export function filterUnassignedTasks(
  tasks: Task[],
  existingPositions: Map<string, unknown>
): Task[] {
  return tasks.filter((task) => isTaskEligibleForAutoAssign(task, existingPositions));
}

