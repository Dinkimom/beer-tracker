/**
 * Локализация машинных кодов статуса спринта (не статусов задач трекера).
 */

import { DEFAULT_LANGUAGE, type AppLanguage } from '@/lib/i18n/model';
import { translate } from '@/lib/i18n/translator';

const SPRINT_STATUS_MESSAGE_KEYS: Record<string, string> = {
  archived: 'sprint.status.archived',
  closed: 'sprint.status.closed',
  draft: 'sprint.status.draft',
  in_progress: 'sprint.status.inProgress',
  released: 'sprint.status.released',
};

/**
 * Переводит машинный код статуса спринта (из трекера) в локализованную подпись.
 */
export function translateSprintStatus(
  status: string,
  language: AppLanguage = DEFAULT_LANGUAGE
): string {
  const key = SPRINT_STATUS_MESSAGE_KEYS[status.trim().toLowerCase()];
  if (!key) {
    return status;
  }
  return translate(language, key);
}
