import type { TransitionItem } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';
import type { DragEndEvent } from '@dnd-kit/core';

import {
  buildKanbanColumnKeysNorm,
  findKanbanStatusTransition,
} from './kanbanColumnTransitionHelpers';
import { getColumnIdFromDroppable, normalizeStatusKeyForComparison, parseKanbanTaskId } from './kanbanDndUtils';
import { KANBAN_UNKNOWN_STATUS_COLUMN_ID } from './kanbanGroupTasksHelpers';

function parseKanbanDragEndDropIds(event: DragEndEvent): { columnId: string; taskId: string } | null {
  const taskId = parseKanbanTaskId(String(event.active.id));
  const overId = event.over?.id;
  const columnId = overId ? getColumnIdFromDroppable(String(overId)) : null;
  if (!taskId || !columnId) return null;
  return { taskId, columnId };
}

function findKanbanDropColumn(
  columnId: string,
  columnsWithTasks: Array<{ column: BoardColumn; tasks: Task[] }>
): BoardColumn | null {
  const column = columnsWithTasks.find((e) => e.column.id === columnId)?.column;
  if (!column || column.id === KANBAN_UNKNOWN_STATUS_COLUMN_ID) return null;
  return column;
}

function findKanbanColumnTransition(
  column: BoardColumn,
  task: Task | undefined,
  transitionsForActive: TransitionItem[]
): TransitionItem | null {
  const columnKeysNorm = buildKanbanColumnKeysNorm(column);
  if (!columnKeysNorm.size) return null;

  const taskStatusNorm = normalizeStatusKeyForComparison(task?.originalStatus || '');
  if (taskStatusNorm && columnKeysNorm.has(taskStatusNorm)) return null;

  return findKanbanStatusTransition(transitionsForActive, columnKeysNorm) ?? null;
}

export function resolveKanbanDragEndTarget(
  event: DragEndEvent,
  tasksForKanban: Task[],
  columnsWithTasks: Array<{ column: BoardColumn; tasks: Task[] }>,
  transitionsForActive: TransitionItem[]
): { column: BoardColumn; taskId: string; transition: TransitionItem } | null {
  const ids = parseKanbanDragEndDropIds(event);
  if (!ids) return null;

  const column = findKanbanDropColumn(ids.columnId, columnsWithTasks);
  if (!column) return null;

  const task = tasksForKanban.find((t) => t.id === ids.taskId);
  const transition = findKanbanColumnTransition(column, task, transitionsForActive);
  if (!transition) return null;

  return { taskId: ids.taskId, column, transition };
}
