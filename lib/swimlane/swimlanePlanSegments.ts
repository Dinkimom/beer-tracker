import type { PhaseSegment, TaskPosition } from '@/types';

import { PARTS_PER_DAY, WORKING_DAYS } from '@/constants';
import { mergeAdjacentSegments } from '@/lib/planner-timeline';

function rangesOverlap(
  a: { endCell: number; startCell: number },
  b: { endCell: number; startCell: number }
): boolean {
  return a.startCell < b.endCell && a.endCell > b.startCell;
}

function segmentRangesOverlap(
  ranges: Array<{ endCell: number; startCell: number }>
): boolean {
  return ranges.some((a, index) =>
    ranges.slice(index + 1).some((b) => rangesOverlap(a, b))
  );
}

function buildSegmentRanges(segments: PhaseSegment[]): Array<{ endCell: number; startCell: number }> {
  return segments.map((segment) => {
    const startCell = segment.startDay * PARTS_PER_DAY + segment.startPart;
    return { startCell, endCell: startCell + segment.duration };
  });
}

function applyMovedSegmentAtStartCell(
  ordered: PhaseSegment[],
  segmentIndex: number,
  newStartCell: number,
  duration: number
): PhaseSegment[] {
  return ordered.map((segment, index) =>
    index === segmentIndex
      ? {
          ...segment,
          startDay: Math.floor(newStartCell / PARTS_PER_DAY),
          startPart: newStartCell % PARTS_PER_DAY,
          duration,
        }
      : segment
  );
}

function buildPositionFromMergedSegments(
  position: TaskPosition,
  merged: PhaseSegment[]
): TaskPosition {
  const effectiveDuration = merged.reduce((sum, segment) => sum + segment.duration, 0);
  const first = merged[0]!;
  return {
    ...position,
    segments: merged,
    startDay: first.startDay,
    startPart: first.startPart,
    duration: effectiveDuration,
  };
}

function hasOverlappingSegmentRanges(segments: PhaseSegment[]): boolean {
  return segmentRangesOverlap(buildSegmentRanges(segments));
}

/** Отрезки плана для свимлейна: из segments или один блок из startDay/startPart/duration. */
export function getOrderedPlanSegments(position: TaskPosition): PhaseSegment[] {
  if (position.segments && position.segments.length > 0) {
    return [...position.segments].sort(
      (a, b) =>
        a.startDay * PARTS_PER_DAY + a.startPart - (b.startDay * PARTS_PER_DAY + b.startPart)
    );
  }
  return [
    {
      startDay: position.startDay,
      startPart: position.startPart,
      duration: position.duration,
    },
  ];
}

/**
 * Переносит один отрезок плана на newStartCell; остальные не двигаются.
 * null — вне спринта или пересечение с другим отрезком этой же позиции.
 */
export function moveSwimlanePlanSegmentToStartCell(
  position: TaskPosition,
  segmentIndex: number,
  newStartCell: number,
  totalCells: number = WORKING_DAYS * PARTS_PER_DAY
): TaskPosition | null {
  if (!position.segments?.length) return null;
  const ordered = getOrderedPlanSegments(position);
  if (segmentIndex < 0 || segmentIndex >= ordered.length) return null;
  const seg = ordered[segmentIndex]!;
  const dur = seg.duration;
  const newEnd = newStartCell + dur;
  if (newStartCell < 0 || newEnd > totalCells) return null;

  const updated = applyMovedSegmentAtStartCell(ordered, segmentIndex, newStartCell, dur);
  if (hasOverlappingSegmentRanges(updated)) return null;

  return buildPositionFromMergedSegments(position, mergeAdjacentSegments(updated));
}
