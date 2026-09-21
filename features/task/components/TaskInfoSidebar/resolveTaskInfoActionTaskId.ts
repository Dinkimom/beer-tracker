import type { Task } from '@/types';

/**
 * ID задачи для перехода статуса в трекере.
 * Для синтетической QA-строки с объёмом разработки двигаем исходную dev-задачу.
 */
export function resolveTaskInfoActionTaskId(task: Task): string {
  const storyPoints = task.storyPoints ?? 0;
  const testPoints = task.testPoints ?? 0;
  if (task.team === 'QA' && task.originalTaskId && (storyPoints > 0 || testPoints > 0)) {
    return task.originalTaskId;
  }
  return task.id;
}
