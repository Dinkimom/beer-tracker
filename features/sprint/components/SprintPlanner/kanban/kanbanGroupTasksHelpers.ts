import type { Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

export const KANBAN_UNKNOWN_STATUS_COLUMN_ID = '__unknown__';

function normKanbanStatusKey(key: string): string {
  return (key || '').toLowerCase().replace(/[\s_-]/g, '').trim();
}

function findColumnIdForTaskStatus(
  taskStatusNorm: string,
  columns: BoardColumn[]
): string {
  const column = columns.find((col) =>
    col.statusKeys?.some((k) => normKanbanStatusKey(k) === taskStatusNorm)
  );
  return column?.id ?? KANBAN_UNKNOWN_STATUS_COLUMN_ID;
}

function assignKanbanTaskToColumn(
  result: Map<string, { column: BoardColumn; tasks: Task[] }>,
  task: Task,
  columns: BoardColumn[]
): void {
  const taskStatusNorm = normKanbanStatusKey(task.originalStatus ?? '');
  const columnId = taskStatusNorm
    ? findColumnIdForTaskStatus(taskStatusNorm, columns)
    : KANBAN_UNKNOWN_STATUS_COLUMN_ID;
  result.get(columnId)?.tasks.push(task);
}

export function groupKanbanTasksByColumns(
  tasks: Task[],
  columns: BoardColumn[],
  unknownStatusDisplay: string
): Map<string, { column: BoardColumn; tasks: Task[] }> {
  const result = new Map<string, { column: BoardColumn; tasks: Task[] }>();
  columns.forEach((col) => result.set(col.id, { column: col, tasks: [] }));

  const unknownColumn: BoardColumn = {
    id: KANBAN_UNKNOWN_STATUS_COLUMN_ID,
    display: unknownStatusDisplay,
  };
  result.set(KANBAN_UNKNOWN_STATUS_COLUMN_ID, { column: unknownColumn, tasks: [] });

  for (const task of tasks) {
    assignKanbanTaskToColumn(result, task, columns);
  }

  return result;
}

export function orderKanbanGroupedColumns(
  grouped: Map<string, { column: BoardColumn; tasks: Task[] }>,
  boardColumns: BoardColumn[]
): Array<{ column: BoardColumn; tasks: Task[] }> {
  const ordered: Array<{ column: BoardColumn; tasks: Task[] }> = [];
  boardColumns.forEach((col) => {
    const entry = grouped.get(col.id);
    if (entry) ordered.push(entry);
  });
  const unknown = grouped.get(KANBAN_UNKNOWN_STATUS_COLUMN_ID);
  if (unknown && unknown.tasks.length > 0) ordered.push(unknown);
  return ordered;
}
