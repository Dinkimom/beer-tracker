import type { Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { computeKanbanColumnTaskTotals } from './kanbanViewColumnTotalsHelpers';
import { resolveKanbanLaneDisplayName } from './kanbanViewLaneNameHelpers';

/** Итоги колонки — по всем её задачам: поиск карточки только приглушает. */
export function buildKanbanColumnsWithHeaderData(ordered: Array<{ column: BoardColumn; tasks: Task[] }>) {
  return ordered.map(({ column, tasks: columnTasks }) => {
    const { totalSp, totalTp } = computeKanbanColumnTaskTotals(columnTasks);
    return { column, tasks: columnTasks, totalSp, totalTp };
  });
}

export { resolveKanbanLaneDisplayName };

export function kanbanLaneTotals(laneTasks: Task[]): { totalSp: number; totalTp: number } {
  return computeKanbanColumnTaskTotals(laneTasks);
}
