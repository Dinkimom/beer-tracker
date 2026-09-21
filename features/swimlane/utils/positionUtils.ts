import type { TaskPosition } from '@/types';

import { WORKING_DAYS, PARTS_PER_DAY } from '@/constants';
import { mergeAdjacentSegments, positionToStartCell } from '@/lib/planner-timeline';
import { getOrderedPlanSegments } from '@/lib/swimlane/swimlanePlanSegments';

import {
  applyResizedSegment,
  buildPositionFromMergedSegments,
  validateResizeSegmentBounds,
} from './positionUtilsHelpers';

export { getOrderedPlanSegments };

/**
 * Вычисляет начальную позицию в ячейках (минимальная по всем отрезкам, если есть segments).
 */
function getStartCell(position: TaskPosition): number {
  return positionToStartCell(position);
}

const defaultTimelineTotalParts = () => WORKING_DAYS * PARTS_PER_DAY;

/** Левая граница отрезка в процентах ширины таймлайна спринта. */
export function getLeftPercentForSegmentStartCell(
  startCell: number,
  timelineTotalParts: number = defaultTimelineTotalParts()
): number {
  return (startCell / timelineTotalParts) * 100;
}

/**
 * Вычисляет процентную позицию слева для карточки
 */
export function getLeftPercent(
  position: TaskPosition,
  timelineTotalParts: number = defaultTimelineTotalParts()
): number {
  return getLeftPercentForSegmentStartCell(getStartCell(position), timelineTotalParts);
}

/**
 * Вычисляет процентную ширину карточки
 */
export function getWidthPercent(
  duration: number,
  timelineTotalParts: number = defaultTimelineTotalParts()
): number {
  return (duration / timelineTotalParts) * 100;
}

/**
 * Меняет длительность (и при необходимости начало) одного отрезка плана; остальные не двигаются.
 * null — выход за спринт или пересечение с соседним отрезком.
 */
export function resizeSwimlanePlanSegment(
  position: TaskPosition,
  segmentIndex: number,
  newDuration: number,
  newStartCell?: number,
  totalCells: number = WORKING_DAYS * PARTS_PER_DAY
): TaskPosition | null {
  if (!position.segments?.length) return null;
  const ordered = getOrderedPlanSegments(position);
  if (segmentIndex < 0 || segmentIndex >= ordered.length) return null;
  if (newDuration < 1) return null;

  const segs = ordered.map((s) => ({ ...s }));
  const seg = segs[segmentIndex]!;
  const startCell = newStartCell ?? seg.startDay * PARTS_PER_DAY + seg.startPart;
  const endCell = startCell + newDuration;
  if (!validateResizeSegmentBounds(startCell, endCell, segmentIndex, segs, totalCells)) {
    return null;
  }

  const resized = applyResizedSegment(segs, segmentIndex, startCell, newDuration);
  return buildPositionFromMergedSegments(position, mergeAdjacentSegments(resized));
}

/**
 * Вычисляет максимальную длительность задачи от текущей позиции
 */
export function getMaxDuration(
  position: TaskPosition,
  timelineTotalParts: number = defaultTimelineTotalParts()
): number {
  const currentStart = getStartCell(position);
  return timelineTotalParts - currentStart;
}
