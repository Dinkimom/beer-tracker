/**
 * Утилиты для работы с интервалами времени
 */

import type { TimeInterval } from '../types';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';

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
 * Вычисляет занятые интервалы для каждого разработчика на основе позиций задач
 */
export function calculateOccupiedIntervals(
  positions: Map<string, { assignee: string; startDay: number; startPart: number; duration: number }>,
  developerIds: string[]
): Map<string, TimeInterval[]> {
  const occupiedIntervals = new Map<string, TimeInterval[]>();

  developerIds.forEach((devId) => {
    occupiedIntervals.set(devId, []);
  });

  positions.forEach((position) => {
    const intervals = occupiedIntervals.get(position.assignee) || [];
    const startCell = position.startDay * getPartsPerDay() + position.startPart;
    const endCell = startCell + position.duration;
    intervals.push({ start: startCell, end: endCell });
    occupiedIntervals.set(position.assignee, intervals);
  });

  return occupiedIntervals;
}

/**
 * Находит первую свободную позицию после всех занятых интервалов
 * Минимальная позиция - currentCell (не планируем в прошлое)
 * Возвращает позицию или null, если задача не поместится
 */
export function findNextAvailableCell(
  intervals: TimeInterval[],
  taskDuration: number,
  currentCell: number = 0
): number | null {
  const minStartCell = Math.max(0, currentCell);
  const maxEndCell = WORKING_DAYS * getPartsPerDay();

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
 * Находит свободное место для QA задачи после dev задачи
 */
export function findQATaskPlacement(
  intervals: TimeInterval[],
  taskDuration: number,
  minStartCell: number
): number | null {
  const maxEndCell = WORKING_DAYS * getPartsPerDay();

  if (minStartCell + taskDuration > maxEndCell) {
    return null;
  }

  const relevantIntervals = intervals.filter((interval) => interval.end > minStartCell);

  if (relevantIntervals.length === 0) {
    return minStartCell;
  }

  const sorted = [...relevantIntervals].sort((a, b) => a.start - b.start);

  if (minStartCell + taskDuration <= sorted[0].start) {
    return minStartCell;
  }

  const afterLast = findPlacementAfterLastInterval(
    sorted,
    taskDuration,
    minStartCell,
    maxEndCell
  );
  if (afterLast != null) {
    return afterLast;
  }

  return findPlacementBetweenIntervals(sorted, taskDuration, minStartCell);
}
