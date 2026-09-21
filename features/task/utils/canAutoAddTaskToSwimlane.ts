import type { Task } from '@/types';

/** Исполнитель, на чью дорожку ставит быстрое добавление из сайдбара. */
export function resolveAutoAddAssigneeId(task: Task): string | undefined {
  const assigneeId = task.team === 'QA' ? task.qaEngineer : task.assignee;
  return assigneeId || undefined;
}

/** Показывать кнопку и выполнять auto-add только если есть оценка и исполнитель есть на доске. */
export function canAutoAddTaskToSwimlane(input: {
  developerIds: readonly string[];
  estimatedSP: number;
  task: Task;
}): boolean {
  if (input.estimatedSP <= 0) return false;
  const assigneeId = resolveAutoAddAssigneeId(input.task);
  if (!assigneeId) return false;
  return input.developerIds.includes(assigneeId);
}
