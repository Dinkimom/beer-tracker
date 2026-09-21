import type { Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { getTaskStoryPoints, getTaskTestPoints } from '@/lib/pointsUtils';

import {
  computeKanbanColumnTaskTotals,
  filterKanbanColumnTasks,
} from './kanbanViewColumnTotalsHelpers';
import { resolveKanbanLaneDisplayName } from './kanbanViewLaneNameHelpers';

export function kanbanTaskMatchesNameFilter(task: Task, filter: string): boolean {
  if (!filter.trim()) return true;
  const q = filter.trim().toLowerCase();
  return (
    task.name.toLowerCase().includes(q) ||
    task.id.toLowerCase().includes(q) ||
    (task.assigneeName?.toLowerCase().includes(q) ?? false)
  );
}

export function buildKanbanColumnsWithHeaderData(
  ordered: Array<{ column: BoardColumn; tasks: Task[] }>,
  globalNameFilter: string | undefined
) {
  return ordered.map(({ column, tasks: columnTasks }) => {
    const filtered = filterKanbanColumnTasks(columnTasks, globalNameFilter);
    const { totalSp, totalTp } = computeKanbanColumnTaskTotals(filtered);
    return { column, tasks: columnTasks, filteredTasks: filtered, totalSp, totalTp };
  });
}

export { resolveKanbanLaneDisplayName };

export function kanbanLaneTotals(laneTasks: Task[]): { totalSp: number; totalTp: number } {
  return {
    totalSp: laneTasks.reduce((sum, task) => sum + getTaskStoryPoints(task), 0),
    totalTp: laneTasks.reduce((sum, task) => sum + getTaskTestPoints(task), 0),
  };
}
