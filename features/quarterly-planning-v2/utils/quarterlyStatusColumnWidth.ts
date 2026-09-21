import type { Task } from '@/types';

import {
  QUARTERLY_STATUS_COLUMN_DEFAULT_WIDTH_PX,
  QUARTERLY_STATUS_COLUMN_MIN_WIDTH_PX,
} from '../components/planner/quarterlyPlannerLayout';

/** Горизонтальные отступы ячейки статуса (px-1 с двух сторон). */
export const QUARTERLY_STATUS_CELL_HORIZONTAL_PADDING_PX = 8;

/** Уникальные задачи для замера ширины кнопки статуса (по тексту статуса). */
export function tasksForQuarterlyStatusColumnMeasure(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  const result: Task[] = [];
  for (const task of tasks) {
    if (!task.originalStatus?.trim()) continue;
    const dedupeKey = `${task.originalStatus}\0${task.statusColorKey ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(task);
  }
  return result;
}

export function resolveQuarterlyStatusColumnWidth(
  measuredButtonMaxPx: number
): number {
  return Math.max(
    QUARTERLY_STATUS_COLUMN_MIN_WIDTH_PX,
    Math.ceil(measuredButtonMaxPx + QUARTERLY_STATUS_CELL_HORIZONTAL_PADDING_PX)
  );
}

export function quarterlyStatusColumnWidthFallback(): number {
  return QUARTERLY_STATUS_COLUMN_DEFAULT_WIDTH_PX;
}
