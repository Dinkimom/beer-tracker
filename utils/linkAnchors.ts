/**
 * Утилиты таймлайна для связей задач.
 * Якоря стрелок свимлейна — по DOM: utils/nearestSideAnchors.ts.
 */

import type { Anchor, Developer, Task, TaskPosition } from '@/types';

import { positionToEndCell, positionToStartCell } from '@/features/sprint/utils/occupancyUtils';

interface AnchorPair {
  fromAnchor: Anchor;
  toAnchor: Anchor;
}

function cellStart(p: TaskPosition): number {
  return positionToStartCell(p);
}

function cellEnd(p: TaskPosition): number {
  return positionToEndCell(p);
}

/** Интервалы пересекаются по клеткам (касание конец-к-началу — не пересечение). */
export function taskPositionsOverlapOnTimeline(a: TaskPosition, b: TaskPosition): boolean {
  return cellStart(a) < cellEnd(b) && cellStart(b) < cellEnd(a);
}

/**
 * Отрицательное — a раньше b на таймлайне; положительное — a позже.
 * Без пересечения — кто стоит правее (раньше start); при пересечении — кто заканчивается позже.
 * Наконечник стрелки связи рисуем в «later».
 */
export function compareTaskPositionsOnTimeline(
  a: TaskPosition,
  b: TaskPosition
): number {
  if (taskPositionsOverlapOnTimeline(a, b)) {
    const endDiff = cellEnd(a) - cellEnd(b);
    if (endDiff !== 0) return endDiff;
    return cellStart(a) - cellStart(b);
  }
  return cellStart(a) - cellStart(b);
}

/** Упорядочивает пару задач по позиции на таймлайне (раньше → позже). */
export function orderTaskIdsByTimeline(
  taskIdA: string,
  taskIdB: string,
  taskPositions: Map<string, TaskPosition>
): { earlierTaskId: string; laterTaskId: string } {
  const posA = taskPositions.get(taskIdA);
  const posB = taskPositions.get(taskIdB);
  if (!posA || !posB) {
    return { earlierTaskId: taskIdA, laterTaskId: taskIdB };
  }
  if (compareTaskPositionsOnTimeline(posA, posB) <= 0) {
    return { earlierTaskId: taskIdA, laterTaskId: taskIdB };
  }
  return { earlierTaskId: taskIdB, laterTaskId: taskIdA };
}

/**
 * Концы стрелки для отрисовки: наконечник в более позднюю карточку.
 * `forceStoredDirection` — синтетика dev→QA (направление связи важнее таймлайна).
 */
export function resolveLinkArrowDrawTaskIds(
  fromTaskId: string,
  toTaskId: string,
  taskPositions: Map<string, TaskPosition> | undefined,
  forceStoredDirection = false
): { endTaskId: string; startTaskId: string } {
  if (forceStoredDirection || !taskPositions) {
    return { startTaskId: fromTaskId, endTaskId: toTaskId };
  }
  const { earlierTaskId, laterTaskId } = orderTaskIdsByTimeline(
    fromTaskId,
    toTaskId,
    taskPositions
  );
  return { startTaskId: earlierTaskId, endTaskId: laterTaskId };
}

/**
 * Смежные таймслоты (включая один пустой слот между концом источника и началом цели).
 * Используется occupancy и проверками соседства на таймлайне.
 */
export function areAdjacentSwimlaneTimeslots(
  sourceStart: number,
  sourceEnd: number,
  targetStart: number,
  targetEnd: number
): boolean {
  return targetStart <= sourceEnd + 1 && targetEnd >= sourceStart;
}

/**
 * Якоря для сохранения связи при auto-assign QA.
 * Отрисовка на свимлейне пересчитывает стороны по DOM (nearest sides).
 */
export function getQALinkAnchors(
  _devTask: Task,
  _devPosition: TaskPosition,
  _qaTask: Task,
  _qaPosition: TaskPosition,
  _developers: Developer[]
): AnchorPair {
  return { fromAnchor: 'right', toAnchor: 'left' };
}
