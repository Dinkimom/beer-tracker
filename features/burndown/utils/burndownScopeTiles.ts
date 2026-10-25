import type { BurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import { isTaskDone } from '@/features/sprint/utils/sprintMetrics';
import { burndownCompletionPercent } from '@/features/sprint/utils/sprintMetricsHelpers';
import { getTaskStoryPoints, getTaskTestPoints } from '@/lib/pointsUtils';

interface ScopeRow {
  qaTask?: Task;
  task: Task;
}

function filterTasksByNameQuery(tasks: Task[], nameFilter: string): Task[] {
  const query = nameFilter.trim().toLowerCase();
  if (!query) return tasks;
  return tasks.filter(
    (t) =>
      (t.originalTaskId || t.id).toLowerCase().includes(query) ||
      (t.name || '').toLowerCase().includes(query)
  );
}

/** Строка = dev-задача с её QA; QA без dev в выборке — отдельной строкой. */
function buildScopeRows(tasks: Task[]): ScopeRow[] {
  const qaByOriginalId = new Map<string, Task>();
  for (const t of tasks) {
    if (t.originalTaskId) qaByOriginalId.set(t.originalTaskId, t);
  }
  const devIds = new Set(tasks.filter((t) => !t.originalTaskId).map((t) => t.id));
  const rows: ScopeRow[] = [];
  for (const t of tasks) {
    if (!t.originalTaskId) {
      rows.push({ task: t, qaTask: qaByOriginalId.get(t.id) });
    } else if (!devIds.has(t.originalTaskId)) {
      rows.push({ task: t });
    }
  }
  return rows;
}

/**
 * TP строки: у dev и её QA одна оценка тестирования — берём большую, не суммируем.
 * «Сделано», если готова dev-задача или QA.
 */
function rowTestPoints(
  { task, qaTask }: ScopeRow,
  rules: SprintTaskCompletionRules | null
): { completed: number; total: number } {
  const total = Math.max(getTaskTestPoints(task), qaTask ? getTaskTestPoints(qaTask) : 0);
  const done = isTaskDone(task, rules) || (qaTask != null && isTaskDone(qaTask, rules));
  return { completed: total > 0 && done ? total : 0, total };
}

/**
 * Плитки «сделано / всего / %» на бёрндауне: весь объём спринта (не только размещённое на таймлайне),
 * с тем же фильтром по имени, что в планере.
 */
export function computeBurndownScopeTiles(
  tasks: Task[],
  nameFilter: string,
  rules: SprintTaskCompletionRules | null
): BurndownTilesFromTasks {
  let totalScopeSP = 0;
  let totalScopeTP = 0;
  let completedSP = 0;
  let completedTP = 0;

  for (const row of buildScopeRows(filterTasksByNameQuery(tasks, nameFilter))) {
    const sp = getTaskStoryPoints(row.task);
    const tp = rowTestPoints(row, rules);
    totalScopeSP += sp;
    totalScopeTP += tp.total;
    if (isTaskDone(row.task, rules)) completedSP += sp;
    completedTP += tp.completed;
  }

  return {
    completedSP,
    completedTP,
    completionPercentSP: burndownCompletionPercent(completedSP, totalScopeSP),
    completionPercentTP: burndownCompletionPercent(completedTP, totalScopeTP),
    totalScopeSP,
    totalScopeTP,
  };
}
