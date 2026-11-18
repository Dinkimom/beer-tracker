import type { BurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import { computeBurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';

function filterTasksByNameQuery(tasks: Task[], nameFilter: string): Task[] {
  const query = nameFilter.trim().toLowerCase();
  if (!query) return tasks;
  return tasks.filter(
    (t) =>
      (t.originalTaskId || t.id).toLowerCase().includes(query) ||
      (t.name || '').toLowerCase().includes(query)
  );
}

/**
 * Плитки «сделано / всего / %» на бёрндауне: весь объём спринта (не только размещённое на таймлайне)
 * с тем же фильтром по имени, что в планере. Счёт — общий `computeBurndownTilesFromTasks` (правило R3:
 * без QA-задач и целей), как у сайдбара, скора ретро и кривой бёрндауна на сервере.
 */
export function computeBurndownScopeTiles(
  tasks: Task[],
  nameFilter: string,
  goalTaskIds: string[] | undefined,
  rules: SprintTaskCompletionRules | null
): BurndownTilesFromTasks {
  return computeBurndownTilesFromTasks(filterTasksByNameQuery(tasks, nameFilter), goalTaskIds, rules);
}
