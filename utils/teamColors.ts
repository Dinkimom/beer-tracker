/**
 * Единый маппинг цветов для тегов команд (Web, Back, QA, DevOps).
 * Используется в TaskCardTags, TeamTag, TaskBadges, TaskDetailsPanel и др.
 */

export const TEAM_TAG_BG: Record<string, string> = {
  Back: 'bg-emerald-500 dark:bg-emerald-600',
  Web: 'bg-sky-500 dark:bg-sky-600',
  QA: 'bg-amber-500 dark:bg-amber-600',
  DevOps: 'bg-violet-500 dark:bg-violet-600',
};

export const TEAM_TAG_BORDER: Record<string, string> = {
  Back: 'border-emerald-600 dark:border-emerald-700',
  Web: 'border-sky-600 dark:border-sky-700',
  QA: 'border-amber-600 dark:border-amber-700',
  DevOps: 'border-violet-600 dark:border-violet-700',
};

/** Классы для тега команды (сплошной фон + белый текст + граница) */
export function getTeamTagClasses(team: string): string {
  const bg = TEAM_TAG_BG[team] ?? 'bg-gray-500 dark:bg-gray-600';
  const border = TEAM_TAG_BORDER[team] ?? 'border-gray-600 dark:border-gray-700';
  return `${bg} text-white border ${border}`;
}
