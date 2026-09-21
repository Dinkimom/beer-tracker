/**
 * Slug команды из названия (чистая функция — безопасно для клиента).
 */

import { appendTeamSlugChar, collapseTeamSlug } from './teamSlugGenerateHelpers';

/**
 * Латиница, цифры и дефисы из произвольного названия (для slug в БД).
 */
export function generateTeamSlugFromTitle(title: string): string {
  const raw = title.trim();
  if (!raw) {
    return 'team';
  }
  let acc = '';
  for (const ch of raw) {
    acc = appendTeamSlugChar(acc, ch);
  }
  const collapsed = collapseTeamSlug(acc);
  return collapsed || 'team';
}
