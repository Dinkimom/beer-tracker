/**
 * Фильтрует разработчиков по платформе задачи (опираясь на task.team)
 * - QA задачи: только тестировщики
 * - Back/Web: разработчики с соответствующей платформой (или без указания платформ)
 * - DevOps: разработчики (back или web)
 */

import type { Developer, Task } from '@/types';

import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';

function developerMatchesDevTeamPlatform(developer: Developer, team: string): boolean {
  const platforms = developer.platforms ?? [];
  if (platforms.length === 0) return true;
  if (team === 'back') return platforms.includes('back');
  if (team === 'web') return platforms.includes('web');
  if (team === 'devops') return platforms.includes('back') || platforms.includes('web');
  return true;
}

function developerMatchesTaskPlatform(developer: Developer, task: Task): boolean {
  const team = task.team?.toLowerCase() ?? '';

  if (isEffectivelyQaTask(task)) {
    return developer.role === 'tester';
  }

  if (developer.role === 'other') return true;

  if (developer.role !== 'developer') return false;

  return developerMatchesDevTeamPlatform(developer, team);
}

export function getDevelopersForTask(developers: Developer[], task: Task): Developer[] {
  return developers.filter((d) => developerMatchesTaskPlatform(d, task));
}

/**
 * Возвращает всех разработчиков, отсортированных: сначала подходящие по платформе, затем остальные.
 * Используется в пикере исполнителя для возможности назначить любого участника команды.
 */
export function getDevelopersForTaskSorted(developers: Developer[], task: Task): Developer[] {
  return [...developers].sort((a, b) => {
    const aPrimary = developerMatchesTaskPlatform(a, task) && a.role !== 'other';
    const bPrimary = developerMatchesTaskPlatform(b, task) && b.role !== 'other';
    if (aPrimary === bPrimary) return 0;
    return aPrimary ? -1 : 1;
  });
}
