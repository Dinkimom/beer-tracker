import type { Task } from '@/types';

import { sumTaskListPoints } from '@/lib/pointsUtils';

export function filterKanbanColumnTasks(
  columnTasks: Task[],
  globalNameFilter: string | undefined
): Task[] {
  if (!globalNameFilter?.trim()) return columnTasks;
  const q = globalNameFilter.trim().toLowerCase();
  return columnTasks.filter(
    (task) =>
      task.name.toLowerCase().includes(q) ||
      task.id.toLowerCase().includes(q) ||
      (task.assigneeName?.toLowerCase().includes(q) ?? false)
  );
}

/** Итоги колонки — единые правила pointsUtils (фантом QA: SP 0, TP без дубля оригинала). */
export function computeKanbanColumnTaskTotals(filtered: Task[]): { totalSp: number; totalTp: number } {
  const { totalSP, totalTP } = sumTaskListPoints(filtered);
  return { totalSp: totalSP, totalTp: totalTP };
}
