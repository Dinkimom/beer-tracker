/**
 * Dev-задачи спринта с ошибками валидации для вкладки «Невалидные».
 */

import type { Task } from '@/types';

import { isTaskCompleted } from '@/features/task/utils/taskUtils';
import { validateTask, type ValidationIssue } from '@/features/task/utils/taskValidation';

function normalizeGoalIds(goalTaskIds?: string[] | string): string[] {
  if (goalTaskIds == null) return [];
  if (Array.isArray(goalTaskIds)) return goalTaskIds;
  return [goalTaskIds];
}

/**
 * Dev-задачи спринта с ошибками валидации (без QA и без задач на цели).
 * Пока набор правил фиксированный; позже критерии невалидности должны настраиваться.
 */
export function collectInvalidSprintDevTasks(
  tasks: Task[],
  goalTaskIds?: string[] | string
): Array<{ issues: ValidationIssue[]; task: Task }> {
  const goalIds = normalizeGoalIds(goalTaskIds);
  const goalIdSet = new Set(goalIds);

  const devTasksBase = tasks.filter(task => {
    if (task.team === 'QA') return false;
    if (goalIdSet.has(task.id)) return false;
    if (isTaskCompleted(task)) return false;
    return true;
  });

  return devTasksBase
    .map(task => ({
      task,
      issues: validateTask(task),
    }))
    .filter(({ issues }) => issues.length > 0);
}
