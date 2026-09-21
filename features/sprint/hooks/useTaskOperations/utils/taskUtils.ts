/**
 * Вспомогательные функции для работы с задачами
 */

import type { Task } from '@/types';

/**
 * Обновляет задачу в массиве задач
 */
export function updateTaskInArray(
  tasks: Task[],
  taskId: string,
  updater: (task: Task) => Task
): Task[] {
  return tasks.map((task) => {
    if (task.id === taskId || task.originalTaskId === taskId) {
      return updater(task);
    }
    return task;
  });
}

/**
 * Находит задачу по ID (включая поиск по originalTaskId для QA задач)
 */
export function findTaskById(tasks: Task[], taskId: string): Task | undefined {
  return tasks.find((t) => t.id === taskId || t.originalTaskId === taskId);
}

/**
 * Получает actualTaskId для задачи (учитывает QA задачи)
 */
export function getActualTaskId(tasks: Task[], taskId: string): string {
  const task = findTaskById(tasks, taskId);
  return task?.id || taskId;
}

