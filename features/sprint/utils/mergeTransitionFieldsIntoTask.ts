import type { Task } from '@/types';

import { mergeOneTransitionField, TRANSITION_FIELD_ID_TO_TASK_KEY } from './mergeTransitionFieldsIntoTaskHelpers';

export { TRANSITION_FIELD_ID_TO_TASK_KEY };

/**
 * Превращает тело PATCH /status (поля перехода) в частичное обновление Task для локального стейта.
 * Не трогает resolution/comment и неизвестные ключи.
 */
export function mergeTransitionExtraFieldsIntoTask(
  extra: Record<string, unknown> | undefined
): Partial<Task> {
  if (!extra || typeof extra !== 'object') return {};

  const patch: Partial<Task> = {};

  for (const [fieldId, raw] of Object.entries(extra)) {
    Object.assign(patch, mergeOneTransitionField(fieldId, raw));
  }

  return patch;
}
