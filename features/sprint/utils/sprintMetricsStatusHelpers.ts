import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import {
  isSpCompleted,
  isTpCompleted,
} from '@/lib/sprints/sprintTaskCompletion';

/** SP «сделано» с учётом правил интеграции (готово к релизу ≠ SP done). */
export function isDone(
  task: Task,
  rules?: SprintTaskCompletionRules | null
): boolean {
  return isSpCompleted(task, rules);
}

/**
 * TP «сделано»: завершающая категория (тип статуса) или ключ из настроек
 * (readyStatusKey; без настроек — legacy rc).
 */
export function isTpClosedStatus(
  task: Task,
  rules?: SprintTaskCompletionRules | null
): boolean {
  return isTpCompleted(task, rules);
}
