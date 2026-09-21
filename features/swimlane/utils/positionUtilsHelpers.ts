import type { PhaseSegment, TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';

export function buildPositionFromMergedSegments(
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

function isWithinSprintCellBounds(
  startCell: number,
  endCell: number,
  totalCells: number
): boolean {
  return startCell >= 0 && endCell <= totalCells;
}

function segmentStartCell(segment: PhaseSegment): number {
  return segment.startDay * PARTS_PER_DAY + segment.startPart;
}

function respectsPreviousSegmentOnResize(
  startCell: number,
  segmentIndex: number,
  segments: PhaseSegment[]
): boolean {
  if (segmentIndex <= 0) return true;
  const prev = segments[segmentIndex - 1]!;
  return startCell >= segmentStartCell(prev) + prev.duration;
}

function respectsNextSegmentOnResize(
  endCell: number,
  segmentIndex: number,
  segments: PhaseSegment[]
): boolean {
  if (segmentIndex >= segments.length - 1) return true;
  const next = segments[segmentIndex + 1]!;
  return endCell <= segmentStartCell(next);
}

function respectsAdjacentSegmentsOnResize(
  startCell: number,
  endCell: number,
  segmentIndex: number,
  segments: PhaseSegment[]
): boolean {
  return (
    respectsPreviousSegmentOnResize(startCell, segmentIndex, segments) &&
    respectsNextSegmentOnResize(endCell, segmentIndex, segments)
  );
}

export function validateResizeSegmentBounds(
  startCell: number,
  endCell: number,
  segmentIndex: number,
  segments: PhaseSegment[],
  totalCells: number
): boolean {
  if (!isWithinSprintCellBounds(startCell, endCell, totalCells)) return false;
  return respectsAdjacentSegmentsOnResize(startCell, endCell, segmentIndex, segments);
}

export function applyResizedSegment(
  segments: PhaseSegment[],
  segmentIndex: number,
  startCell: number,
  newDuration: number
): PhaseSegment[] {
  const next = [...segments];
  next[segmentIndex] = {
    startDay: Math.floor(startCell / PARTS_PER_DAY),
    startPart: startCell % PARTS_PER_DAY,
    duration: newDuration,
  };
  return next;
}
