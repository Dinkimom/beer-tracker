import type { Task } from '@/types';

import { collectTaskValidationIssues } from '@/features/task/utils/taskValidationHelpers';

type ValidationIssueType =
  'missing-functional-team' | 'missing-product-team' | 'missing-sp' | 'missing-stage' | 'missing-tp' | 'multiple-sprints';

export interface ValidationIssue {
  params?: Record<string, number | string>;
  type: ValidationIssueType;
}

/**
 * Валидирует задачу и возвращает список проблем.
 * Пока набор правил фиксированный; позже критерии невалидной задачи должны настраиваться.
 */
export function validateTask(task: Task): ValidationIssue[] {
  return collectTaskValidationIssues(task);
}
