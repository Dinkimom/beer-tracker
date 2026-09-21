import type { Task } from '@/types';

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

function addKanbanTaskPoints(
  totals: { totalSp: number; totalTp: number },
  task: Task
): void {
  if (typeof task.storyPoints === 'number' && !Number.isNaN(task.storyPoints)) {
    totals.totalSp += task.storyPoints;
  }
  if (typeof task.testPoints === 'number' && !Number.isNaN(task.testPoints)) {
    totals.totalTp += task.testPoints;
  }
}

export function computeKanbanColumnTaskTotals(filtered: Task[]): { totalSp: number; totalTp: number } {
  const totals = { totalSp: 0, totalTp: 0 };
  for (const task of filtered) {
    addKanbanTaskPoints(totals, task);
  }
  return totals;
}
