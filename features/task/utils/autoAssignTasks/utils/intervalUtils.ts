/**
 * Утилиты для работы с интервалами времени
 */

import type { TimeInterval } from '../types';
import type { TaskPosition } from '@/types';

import { getPositionSegmentRanges } from '@/lib/planner-timeline';

import {
  findPlacementAfterLastInterval,
  findPlacementBetweenIntervals,
} from './intervalPlacementHelpers';

/**
 * Проверяет пересечение двух интервалов
 */
export function intervalsIntersect(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Вычисляет занятые интервалы для каждого разработчика на основе позиций задач.
 * У позиции с отрезками занято каждое окно отдельно: пробелы между ними свободны.
 */
export function calculateOccupiedIntervals(
  positions: Map<string, TaskPosition>,
  developerIds: string[]
): Map<string, TimeInterval[]> {
  const occupiedIntervals = new Map<string, TimeInterval[]>();

  developerIds.forEach((devId) => {
    occupiedIntervals.set(devId, []);
  });

  positions.forEach((position) => {
    const intervals = occupiedIntervals.get(position.assignee) || [];
    for (const range of getPositionSegmentRanges(position)) {
      intervals.push({ start: range.startCell, end: range.endCell });
    }
    occupiedIntervals.set(position.assignee, intervals);
  });

  return occupiedIntervals;
}

/** Дни (праздники) как окна ячеек таймлайна. */
export function dayIntervals(dayIndices: Iterable<number>, partsPerDay: number): TimeInterval[] {
  return [...dayIndices].map((day) => ({ start: day * partsPerDay, end: (day + 1) * partsPerDay }));
}

/**
 * Находит первую свободную позицию после всех занятых интервалов
 * Минимальная позиция - currentCell (не планируем в прошлое)
 * `blocked` — окна без работы (праздники): карточка их не пересекает и сдвигается за них.
 * Возвращает позицию или null, если задача не поместится
 */
export function findNextAvailableCell(
  intervals: TimeInterval[],
  taskDuration: number,
  currentCell: number,
  maxEndCell: number,
  blocked: readonly TimeInterval[] = []
): number | null {
  const start = findNextCellAfterWork(intervals, taskDuration, currentCell, maxEndCell);
  if (start == null || blocked.length === 0) {
    return start;
  }
  return findFirstFreeCell([...intervals, ...blocked], taskDuration, start, maxEndCell);
}

function findNextCellAfterWork(
  intervals: TimeInterval[],
  taskDuration: number,
  currentCell: number,
  maxEndCell: number
): number | null {
  const minStartCell = Math.max(0, currentCell);

  if (minStartCell + taskDuration > maxEndCell) {
    return null;
  }

  if (intervals.length === 0) {
    return minStartCell;
  }

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const futureIntervals = sorted.filter((interval) => interval.end > minStartCell);

  if (futureIntervals.length === 0) {
    return minStartCell;
  }

  const afterLast = findPlacementAfterLastInterval(
    futureIntervals,
    taskDuration,
    minStartCell,
    maxEndCell
  );
  if (afterLast != null) {
    return afterLast;
  }

  return findPlacementBetweenIntervals(futureIntervals, taskDuration, minStartCell);
}

/**
 * Первое свободное окно длиной `taskDuration` не раньше `minStartCell`
 * (зазоры между занятыми интервалами тоже подходят). null — не помещается до `maxEndCell`.
 */
export function findFirstFreeCell(
  intervals: readonly TimeInterval[],
  taskDuration: number,
  minStartCell: number,
  maxEndCell: number
): number | null {
  let candidate = Math.max(0, minStartCell);
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  for (const interval of sorted) {
    if (interval.end <= candidate) continue;
    if (candidate + taskDuration <= interval.start) break;
    candidate = interval.end;
  }
  return candidate + taskDuration <= maxEndCell ? candidate : null;
}
