'use client';

import type { SidebarGroupBy, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { isPlannerAnnotationTask } from '@/features/task/utils/swimlaneImageTask';

export function filterKanbanTasksForDisplay(tasks: Task[]): Task[] {
  return tasks.filter(
    (task) => !isPlannerAnnotationTask(task) && !(task.team === 'QA' && task.originalTaskId)
  );
}

export function resolveKanbanGroupFlags(groupBy: SidebarGroupBy) {
  const groupByAssignee = groupBy === 'assignee';
  const groupByParent = groupBy === 'parent';
  return {
    groupByAssignee,
    groupByParent,
    hasLaneGrouping: groupByAssignee || groupByParent,
  };
}

export function computeKanbanColumnsMinWidth(columnCount: number): number | undefined {
  if (columnCount === 0) return undefined;
  const COLUMN_WIDTH = 280;
  const GAP = 16;
  const PADDING_X = 32;
  return columnCount * COLUMN_WIDTH + (columnCount - 1) * GAP + PADDING_X;
}

export function resolveKanbanHeaderColumns<T extends { column: BoardColumn }>(
  hasLaneGrouping: boolean,
  columnsWithHeaderData: T[],
  lanesWithColumns: Array<{ columnsWithHeaderData: T[] }>,
  displayColumns: T[]
): T[] {
  return hasLaneGrouping ? columnsWithHeaderData : displayColumns;
}

export function resolveKanbanDisplayColumns<T>(
  hasLaneGrouping: boolean,
  lanesWithColumns: Array<{ columnsWithHeaderData: T[] }>,
  columnsWithHeaderData: T[]
): T[] {
  if (hasLaneGrouping && lanesWithColumns.length > 0) {
    return lanesWithColumns[0]!.columnsWithHeaderData;
  }
  return columnsWithHeaderData;
}
