/**
 * Утилиты для поиска свободных интервалов
 */

import type { TimeInterval } from '../types';

import { intervalsIntersect } from './intervalUtils';

function candidateFitsInIntervals(
  candidateStart: number,
  taskDuration: number,
  intervals: TimeInterval[]
): boolean {
  const candidateInterval = { start: candidateStart, end: candidateStart + taskDuration };
  return !intervals.some((interval) => intervalsIntersect(candidateInterval, interval));
}

export function findPlacementAfterLastInterval(
  sortedIntervals: TimeInterval[],
  taskDuration: number,
  minStartCell: number,
  maxEndCell: number
): number | null {
  const maxEnd = Math.max(...sortedIntervals.map((interval) => interval.end));
  const nextStart = Math.max(minStartCell, maxEnd);
  if (nextStart + taskDuration > maxEndCell) {
    return null;
  }
  if (candidateFitsInIntervals(nextStart, taskDuration, sortedIntervals)) {
    return nextStart;
  }
  return null;
}

function tryPlacementBeforeInterval(
  candidateStart: number,
  taskDuration: number,
  interval: TimeInterval,
  previousIntervals: TimeInterval[]
): number | null {
  if (candidateStart + taskDuration > interval.start) {
    return null;
  }
  if (!candidateFitsInIntervals(candidateStart, taskDuration, previousIntervals)) {
    return null;
  }
  return candidateStart;
}

export function findPlacementBetweenIntervals(
  sortedIntervals: TimeInterval[],
  taskDuration: number,
  minStartCell: number
): number | null {
  let candidateStart = minStartCell;
  for (let i = 0; i < sortedIntervals.length; i++) {
    const interval = sortedIntervals[i];
    const placement = tryPlacementBeforeInterval(
      candidateStart,
      taskDuration,
      interval,
      sortedIntervals.slice(0, i)
    );
    if (placement !== null) {
      return placement;
    }

    candidateStart = Math.max(candidateStart, interval.end);
  }
  return null;
}
