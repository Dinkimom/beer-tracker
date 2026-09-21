import type { PositionPreview } from '../components/task-row/plan/occupancyPhaseBar.types';
import type { TaskPosition } from '@/types';

import {
  cellToPosition,
  cellsToPositionDayMode,
} from '../components/task-row/plan/occupancyPhaseBarConstants';

export function emitPhaseBarResizePreview(input: {
  isDayMode: boolean;
  onPreviewChange?: (preview: PositionPreview | null) => void;
  startCell: number;
  duration: number;
}) {
  if (input.isDayMode) {
    const p = cellsToPositionDayMode(input.startCell, input.duration);
    input.onPreviewChange?.({
      startDay: p.startDay,
      startPart: p.startPart,
      duration: p.duration,
    });
    return;
  }
  const { startDay, startPart } = cellToPosition(input.startCell);
  input.onPreviewChange?.({
    startDay,
    startPart,
    duration: input.duration,
  });
}

export function applyPhaseBarRightResizeMove(input: {
  currentStart: number;
  cursorCell: number;
  grabOffsetCells: number;
  resolvedTotalParts: number;
}) {
  let newEnd = Math.round(input.cursorCell - input.grabOffsetCells);
  newEnd = Math.max(input.currentStart + 1, Math.min(input.resolvedTotalParts, newEnd));
  const newDuration = newEnd - input.currentStart;
  return { startCell: input.currentStart, duration: newDuration };
}

export function applyPhaseBarLeftResizeMove(input: {
  currentEnd: number;
  cursorCell: number;
  grabOffsetCells: number;
}) {
  let newStart = Math.round(input.cursorCell - input.grabOffsetCells);
  newStart = Math.max(0, Math.min(input.currentEnd - 1, newStart));
  const newDuration = input.currentEnd - newStart;
  return { startCell: newStart, duration: newDuration };
}

export function buildPhaseBarResizeSavedPosition(input: {
  isDayMode: boolean;
  position: TaskPosition;
  startCell: number;
  duration: number;
}) {
  if (input.isDayMode) {
    const p = cellsToPositionDayMode(input.startCell, input.duration);
    return {
      ...input.position,
      ...p,
      plannedStartDay: p.startDay,
      plannedStartPart: p.startPart,
      plannedDuration: p.duration,
    };
  }
  const { startDay, startPart } = cellToPosition(input.startCell);
  return {
    ...input.position,
    startDay,
    startPart,
    duration: input.duration,
    plannedStartDay: startDay,
    plannedStartPart: startPart,
    plannedDuration: input.duration,
  };
}
