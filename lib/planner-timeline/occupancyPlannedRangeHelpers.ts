import type { PhaseSegment } from '@/types';

import { getPartsPerDay } from '@/constants';

function segmentCellRange(seg: PhaseSegment): { endCell: number; startCell: number } {
  const startCell = seg.startDay * getPartsPerDay() + seg.startPart;
  return { endCell: startCell + seg.duration, startCell };
}

export function plannedSegmentCellRange(
  segments: PhaseSegment[]
): { endCell: number; startCell: number } | null {
  const ranges = segments.filter((seg) => seg.duration > 0).map(segmentCellRange);
  if (ranges.length === 0) {
    return null;
  }
  return {
    endCell: Math.max(...ranges.map((range) => range.endCell)),
    startCell: Math.min(...ranges.map((range) => range.startCell)),
  };
}

export function plannedExplicitCellRange(position: {
  duration: number;
  plannedStartDay?: number | null;
  plannedStartPart?: number | null;
  plannedDuration?: number | null;
}): { endCell: number; startCell: number } | null {
  const { plannedStartDay, plannedStartPart, plannedDuration, duration } = position;
  if (plannedStartDay == null || plannedStartPart == null) {
    return null;
  }
  const plannedDurationParts = plannedDuration ?? duration;
  if (plannedDurationParts <= 0) {
    return null;
  }
  const startCell = plannedStartDay * getPartsPerDay() + plannedStartPart;
  return { endCell: startCell + plannedDurationParts, startCell };
}
