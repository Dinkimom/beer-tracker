import type { Task } from '@/types';

import { sumTaskListPoints } from '@/lib/pointsUtils';

/** Поиск канбана: подстрока в названии, ключе или имени исполнителя. */
function kanbanTaskMatchesNameFilter(task: Task, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  return (
    task.name.toLowerCase().includes(q) ||
    task.id.toLowerCase().includes(q) ||
    (task.assigneeName?.toLowerCase().includes(q) ?? false)
  );
}

export function filterKanbanColumnTasks(
  columnTasks: Task[],
  globalNameFilter: string | undefined
): Task[] {
  if (!globalNameFilter?.trim()) return columnTasks;
  return columnTasks.filter((task) => kanbanTaskMatchesNameFilter(task, globalNameFilter));
}

/** Итоги колонки — единые правила pointsUtils (фантом QA: SP 0, TP без дубля оригинала). */
export function computeKanbanColumnTaskTotals(filtered: Task[]): { totalSp: number; totalTp: number } {
  const { totalSP, totalTP } = sumTaskListPoints(filtered);
  return { totalSp: totalSP, totalTp: totalTP };
}
