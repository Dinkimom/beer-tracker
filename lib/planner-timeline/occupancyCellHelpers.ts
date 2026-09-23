import type { PhaseSegment } from '@/types';

import { getPartsPerDay } from '@/constants';

export function appendOnCellSegment(
  segments: PhaseSegment[],
  startCell: number,
  cells: boolean[],
  fromIndex: number,
  toIndex: number
): void {
  const segStartCell = startCell + fromIndex;
  const duration = toIndex - fromIndex;
  segments.push({
    startDay: Math.floor(segStartCell / getPartsPerDay()),
    startPart: segStartCell % getPartsPerDay(),
    duration,
  });
}

export function scanOnCellBlock(
  cells: boolean[],
  startIndex: number
): { nextIndex: number; endIndex: number } {
  let endIndex = startIndex;
  while (endIndex < cells.length && cells[endIndex]) {
    endIndex += 1;
  }
  return { nextIndex: endIndex, endIndex };
}

export function scanOffCellBlock(
  cells: boolean[],
  startIndex: number
): { nextIndex: number; endIndex: number } {
  let endIndex = startIndex;
  while (endIndex < cells.length && !cells[endIndex]) {
    endIndex += 1;
  }
  return { nextIndex: endIndex, endIndex };
}
