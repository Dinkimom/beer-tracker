/**
 * Утилиты для работы со спринтами в бэклоге
 */

import type { SprintListItem } from '@/types/tracker';

/**
 * Разделяет спринты на активные и архивные, сортирует их
 */
export function organizeSprints(sprints: SprintListItem[]): {
  activeSprints: SprintListItem[];
  archivedSprints: SprintListItem[];
} {
  if (!sprints || !Array.isArray(sprints)) {
    return { activeSprints: [], archivedSprints: [] };
  }

  const active = sprints.filter(s => !s.archived);
  const archived = sprints.filter(s => s.archived);

  // Сортируем активные спринты: сначала in_progress, потом draft и остальные по названию
  active.sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });

  // Сортируем архивные по дате начала (новые сначала)
  archived.sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return { activeSprints: active, archivedSprints: archived };
}

