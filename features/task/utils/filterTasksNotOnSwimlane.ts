import type { TaskPosition } from '@/types';

/** Исключает задачи, уже размещённые на свимлейне текущего спринта. */
export function filterTasksNotOnSwimlane<T extends { id: string }>(
  tasks: T[],
  taskPositions: Map<string, TaskPosition> | null | undefined,
  selectedSprintId: number | null | undefined
): T[] {
  if (selectedSprintId == null || !taskPositions) {
    return tasks;
  }
  return tasks.filter((task) => !taskPositions.has(task.id));
}
