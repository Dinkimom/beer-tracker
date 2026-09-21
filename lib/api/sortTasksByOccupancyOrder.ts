import type { OccupancyTaskOrder } from './types';
import type { Task } from '@/types';

import {
  appendOccupancySortedGroups,
  resolveOccupancyParentIds,
} from './sortTasksByOccupancyOrderHelpers';

/**
 * Сортирует задачи по сохранённому порядку занятости (parentIds + taskOrders).
 * Ручной порядок пользователя имеет наивысший приоритет; при его отсутствии — по ключу задачи (id).
 * Используется на бэкенде в /api/tracker.
 */
export function sortTasksByOccupancyOrder(
  tasks: Task[],
  order: OccupancyTaskOrder | null
): Task[] {
  if (!tasks.length) return tasks;

  const byParent = new Map<string | '__root__', Task[]>();
  for (const t of tasks) {
    const key = t.parent?.id ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }

  const parentIds = resolveOccupancyParentIds(tasks, byParent, order);
  const result: Task[] = [];
  appendOccupancySortedGroups(result, parentIds, byParent, order);
  return result;
}
